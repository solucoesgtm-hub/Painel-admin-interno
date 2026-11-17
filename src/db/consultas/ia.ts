// Consultas das gerações por IA. Gravar a geração e o histórico vão no mesmo lote.
import { and, desc, eq, gte, sql, sum } from "drizzle-orm";
import { db } from "../index";
import { diagnosticos, historico, planosIa, socios, type NovoPlanoIa } from "../schema";

export async function salvarPlanoIa(dados: Omit<NovoPlanoIa, "id">, leadNome: string) {
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(planosIa).values({ ...dados, id }),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: dados.criadoPor,
      acao: dados.situacao === "erro" ? "executou" : "criou",
      entidade: "plano_ia",
      entidadeId: id,
      detalhes: {
        nome: leadNome,
        leadId: dados.leadId,
        situacao: dados.situacao ?? "ok",
        modelo: dados.modelo,
        custoCentavos: dados.custoCentavos ?? 0,
      },
    }),
  ]);
  return id;
}

/** Completa um plano gravado com o esqueleto de código, somando tokens e custo da segunda chamada. */
export async function anexarCodigo(
  planoId: string,
  conteudo: Record<string, unknown>,
  uso: { tokensEntrada: number; tokensSaida: number; tokensCacheLeitura: number; tokensCacheEscrita: number; custoCentavos: number },
  socioId: string,
  leadNome: string,
) {
  await db.batch([
    db
      .update(planosIa)
      .set({
        conteudo,
        tokensEntrada: sql`${planosIa.tokensEntrada} + ${uso.tokensEntrada}`,
        tokensSaida: sql`${planosIa.tokensSaida} + ${uso.tokensSaida}`,
        tokensCacheLeitura: sql`${planosIa.tokensCacheLeitura} + ${uso.tokensCacheLeitura}`,
        tokensCacheEscrita: sql`${planosIa.tokensCacheEscrita} + ${uso.tokensCacheEscrita}`,
        custoCentavos: sql`${planosIa.custoCentavos} + ${uso.custoCentavos}`,
      })
      .where(eq(planosIa.id, planoId)),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "editou",
      entidade: "plano_ia",
      entidadeId: planoId,
      detalhes: { nome: leadNome, etapa: "codigo", custoCentavos: uso.custoCentavos },
    }),
  ]);
}

/** Uma geração gravada (para a segunda etapa). */
export async function buscarPlanoIa(planoId: string) {
  const [linha] = await db
    .select({ plano: planosIa, autor: socios.nome })
    .from(planosIa)
    .innerJoin(socios, eq(planosIa.criadoPor, socios.id))
    .where(eq(planosIa.id, planoId))
    .limit(1);
  return linha ?? null;
}

/** Última geração que deu certo para o lead, com o nome de quem acionou. */
export async function ultimoPlanoIa(leadId: string) {
  const [linha] = await db
    .select({ plano: planosIa, autor: socios.nome })
    .from(planosIa)
    .innerJoin(socios, eq(planosIa.criadoPor, socios.id))
    .where(and(eq(planosIa.leadId, leadId), eq(planosIa.situacao, "ok")))
    .orderBy(desc(planosIa.criadoEm))
    .limit(1);
  return linha ?? null;
}

/** Diagnóstico com as respostas: o indicado (se for do lead) ou o mais recente. */
export async function diagnosticoParaIa(leadId: string, diagnosticoId?: string) {
  const [linha] = await db
    .select()
    .from(diagnosticos)
    .where(diagnosticoId ? and(eq(diagnosticos.leadId, leadId), eq(diagnosticos.id, diagnosticoId)) : eq(diagnosticos.leadId, leadId))
    .orderBy(desc(diagnosticos.criadoEm))
    .limit(1);
  return linha ?? null;
}

/** Soma do custo estimado (centavos) das gerações desde `desde`, inclusive as que falharam. */
export async function gastoDesde(desde: Date) {
  const [r] = await db.select({ total: sum(planosIa.custoCentavos) }).from(planosIa).where(gte(planosIa.criadoEm, desde));
  return Number(r?.total ?? 0);
}
