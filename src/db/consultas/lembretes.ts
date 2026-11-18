// Lembretes dos projetos. Toda alteração grava no histórico no mesmo lote.
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { historico, lembretes } from "../schema";

export async function listarLembretes(projetoIds: string[]) {
  if (projetoIds.length === 0) return [];
  return db.select().from(lembretes).where(inArray(lembretes.projetoId, projetoIds)).orderBy(asc(lembretes.criadoEm));
}

export async function contarLembretes(projetoId: string) {
  return (await db.select({ id: lembretes.id }).from(lembretes).where(eq(lembretes.projetoId, projetoId))).length;
}

export async function criarLembrete(projetoId: string, texto: string, socioId: string, projetoNome: string) {
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(lembretes).values({ id, projetoId, texto, criadoPor: socioId }),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "criou",
      entidade: "lembrete",
      entidadeId: id,
      detalhes: { nome: `${projetoNome} — ${texto}` },
    }),
  ]);
  return id;
}

export async function editarLembrete(id: string, projetoId: string, texto: string, socioId: string, projetoNome: string) {
  const [linha] = await db
    .select({ texto: lembretes.texto })
    .from(lembretes)
    .where(and(eq(lembretes.id, id), eq(lembretes.projetoId, projetoId)));
  if (!linha) return false;
  await db.batch([
    db.update(lembretes).set({ texto }).where(eq(lembretes.id, id)),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "editou",
      entidade: "lembrete",
      entidadeId: id,
      detalhes: { nome: `${projetoNome} — ${linha.texto} → ${texto}` },
    }),
  ]);
  return true;
}

export async function excluirLembrete(id: string, projetoId: string, socioId: string, projetoNome: string) {
  const [linha] = await db
    .select({ texto: lembretes.texto })
    .from(lembretes)
    .where(and(eq(lembretes.id, id), eq(lembretes.projetoId, projetoId)));
  if (!linha) return false;
  await db.batch([
    db.delete(lembretes).where(eq(lembretes.id, id)),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "excluiu",
      entidade: "lembrete",
      detalhes: { nome: `${projetoNome} — ${linha.texto}` },
    }),
  ]);
  return true;
}

export async function marcarLembrete(id: string, projetoId: string, feito: boolean, socioId: string, projetoNome: string) {
  const [linha] = await db
    .select({ texto: lembretes.texto })
    .from(lembretes)
    .where(and(eq(lembretes.id, id), eq(lembretes.projetoId, projetoId)));
  if (!linha) return false;
  await db.batch([
    db
      .update(lembretes)
      .set({ feito, feitoEm: feito ? new Date() : null, feitoPor: feito ? socioId : null })
      .where(eq(lembretes.id, id)),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: feito ? "executou" : "editou",
      entidade: "lembrete",
      entidadeId: id,
      detalhes: { nome: `${projetoNome} — ${linha.texto}${feito ? " (feito)" : " (reaberto)"}` },
    }),
  ]);
  return true;
}
