// Consultas do funil de leads. Toda alteração grava também uma linha no histórico,
// no mesmo lote, para as duas coisas acontecerem juntas ou nenhuma acontecer.
import { and, asc, desc, eq, lt, notInArray } from "drizzle-orm";
import { db } from "../index";
import { diagnosticos, historico, leads, type Etapa, type NovoDiagnostico, type NovoLead } from "../schema";

/** Leads de todas as etapas, com o dono, prontos para montar as colunas do funil. */
export async function listarFunil() {
  return db.query.leads.findMany({
    with: {
      dono: { columns: { id: true, nome: true } },
      // Só o diagnóstico mais recente, para mostrar pontuação e veredito no card.
      diagnosticos: {
        columns: { pontuacao: true, veredito: true },
        orderBy: [desc(diagnosticos.criadoEm)],
        limit: 1,
      },
    },
    orderBy: [asc(leads.proximoPassoData)],
  });
}

/** Ficha de um lead com os diagnósticos, do mais recente para o mais antigo. */
export async function buscarLead(id: string) {
  return db.query.leads.findFirst({
    where: eq(leads.id, id),
    with: {
      dono: { columns: { id: true, nome: true } },
      diagnosticos: { orderBy: [desc(diagnosticos.criadoEm)] },
    },
  });
}

/** Leads abertos que estão na mesma etapa há mais de `dias` dias. */
export async function listarParados(dias = 7) {
  const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(leads)
    .where(and(lt(leads.etapaDesde, limite), notInArray(leads.etapa, ["manutencao", "perdido"])));
}

export async function criarLead(dados: Omit<NovoLead, "id">, socioId: string) {
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(leads).values({ ...dados, id }),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "criou",
      entidade: "lead",
      entidadeId: id,
      detalhes: { nome: dados.nome },
    }),
  ]);
  return id;
}

/** Move o lead de etapa. Para "perdido", o motivo é obrigatório. */
export async function moverEtapa(
  leadId: string,
  etapa: Etapa,
  socioId: string,
  opcoes: { proximoPasso: string; proximoPassoData: string; motivoPerda?: string },
) {
  if (etapa === "perdido" && !opcoes.motivoPerda?.trim()) {
    throw new Error("Informe o motivo ao marcar um lead como perdido.");
  }
  await db.batch([
    db
      .update(leads)
      .set({
        etapa,
        etapaDesde: new Date(),
        proximoPasso: opcoes.proximoPasso,
        proximoPassoData: opcoes.proximoPassoData,
        motivoPerda: etapa === "perdido" ? opcoes.motivoPerda : null,
      })
      .where(eq(leads.id, leadId)),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "moveu_etapa",
      entidade: "lead",
      entidadeId: leadId,
      detalhes: { etapa, motivoPerda: opcoes.motivoPerda ?? null },
    }),
  ]);
}

/** Edita os dados do lead. O histórico guarda quais campos mudaram. */
export async function atualizarLead(leadId: string, dados: Partial<Omit<NovoLead, "id">>, socioId: string) {
  await db.batch([
    db.update(leads).set(dados).where(eq(leads.id, leadId)),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "editou",
      entidade: "lead",
      entidadeId: leadId,
      detalhes: { nome: dados.nome ?? null, campos: Object.keys(dados) },
    }),
  ]);
}

/** Diagnósticos de um lead, do mais recente para o mais antigo, com o nome de quem fez. */
export async function listarDiagnosticos(leadId: string) {
  return db.query.diagnosticos.findMany({
    where: eq(diagnosticos.leadId, leadId),
    orderBy: [desc(diagnosticos.criadoEm)],
    with: { autor: { columns: { nome: true } } },
  });
}

export async function salvarDiagnostico(dados: Omit<NovoDiagnostico, "id">, leadNome?: string) {
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(diagnosticos).values({ ...dados, id }),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: dados.criadoPor,
      acao: "criou",
      entidade: "diagnostico",
      entidadeId: id,
      detalhes: { nome: leadNome ?? null, leadId: dados.leadId, veredito: dados.veredito, pontuacao: dados.pontuacao },
    }),
  ]);
  return id;
}
