// Lembretes dos projetos. Toda alteração grava no histórico no mesmo lote.
import { and, asc, eq, inArray } from "drizzle-orm";
import type { DadosItem } from "@/lib/regras/lembretes";
import { db } from "../index";
import { historico, lembretes, projetos } from "../schema";

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

/* ---------------- Aba Lembretes (todos os itens, por id) ---------------- */
export async function listarTodos() {
  return db.select().from(lembretes).orderBy(asc(lembretes.criadoEm));
}

export async function criarItem(dados: DadosItem, socioId: string, grupo: string) {
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(lembretes).values({ id, ...dados, criadoPor: socioId }),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "criou",
      entidade: dados.tipo,
      entidadeId: id,
      detalhes: { nome: `${grupo} — ${dados.texto}` },
    }),
  ]);
  return id;
}

export async function alterarItem(
  id: string,
  mudanca: { tipo: "marcar"; feito: boolean } | { tipo: "editar"; texto: string } | { tipo: "excluir" },
  socioId: string,
) {
  const [l] = await db
    .select({ texto: lembretes.texto, tipo: lembretes.tipo, assunto: lembretes.assunto, projeto: projetos.nome })
    .from(lembretes)
    .leftJoin(projetos, eq(lembretes.projetoId, projetos.id))
    .where(eq(lembretes.id, id));
  if (!l) return false;
  const grupo = l.projeto ?? l.assunto ?? "Lembretes";
  const registro = (acao: "editou" | "executou" | "excluiu", nome: string) =>
    db.insert(historico).values({ atorTipo: "socio", atorId: socioId, acao, entidade: l.tipo, entidadeId: acao === "excluiu" ? null : id, detalhes: { nome } });
  if (mudanca.tipo === "marcar") {
    await db.batch([
      db
        .update(lembretes)
        .set({ feito: mudanca.feito, feitoEm: mudanca.feito ? new Date() : null, feitoPor: mudanca.feito ? socioId : null })
        .where(eq(lembretes.id, id)),
      registro(mudanca.feito ? "executou" : "editou", `${grupo} — ${l.texto}${mudanca.feito ? " (feito)" : " (reaberto)"}`),
    ]);
  } else if (mudanca.tipo === "editar") {
    await db.batch([db.update(lembretes).set({ texto: mudanca.texto }).where(eq(lembretes.id, id)), registro("editou", `${grupo} — ${l.texto} → ${mudanca.texto}`)]);
  } else {
    await db.batch([db.delete(lembretes).where(eq(lembretes.id, id)), registro("excluiu", `${grupo} — ${l.texto}`)]);
  }
  return true;
}
