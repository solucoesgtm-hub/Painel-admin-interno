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

/**
 * Soma do custo estimado (centavos) desde `desde`: gerações de plano (inclusive as que falharam)
 * e os demais usos de IA registrados no histórico como "uso_ia" (ex.: triagem de e-mail).
 */
export async function gastoDesde(desde: Date) {
  const [[planos], [outros]] = await Promise.all([
    db.select({ total: sum(planosIa.custoCentavos) }).from(planosIa).where(gte(planosIa.criadoEm, desde)),
    db
      .select({ total: sql<string>`coalesce(sum((${historico.detalhes}->>'custoCentavos')::int), 0)` })
      .from(historico)
      .where(and(eq(historico.entidade, "uso_ia"), gte(historico.criadoEm, desde))),
  ]);
  return Number(planos?.total ?? 0) + Number(outros?.total ?? 0);
}
