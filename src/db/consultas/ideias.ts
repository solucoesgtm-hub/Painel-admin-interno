// Mural de ideias. Toda alteração grava no histórico no mesmo lote.
import { and, desc, eq } from "drizzle-orm";
import type { Marcador } from "@/lib/regras/ideias";
import { db } from "../index";
import { historico, ideias, ideiasMarcadores } from "../schema";

export async function listarIdeias() {
  const [linhas, marcadores] = await Promise.all([
    db.select().from(ideias).orderBy(desc(ideias.criadoEm)),
    db.select({ ideiaId: ideiasMarcadores.ideiaId, socioId: ideiasMarcadores.socioId, marcador: ideiasMarcadores.marcador }).from(ideiasMarcadores),
  ]);
  return linhas.map((i) => ({ ...i, marcadores: marcadores.filter((m) => m.ideiaId === i.id).map(({ socioId, marcador }) => ({ socioId, marcador })) }));
}

export async function buscarIdeia(id: string) {
  const [i] = await db.select().from(ideias).where(eq(ideias.id, id));
  return i ?? null;
}

export async function criarIdeia(titulo: string, texto: string, socioId: string) {
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(ideias).values({ id, titulo, texto, autorId: socioId }),
    db.insert(historico).values({ atorTipo: "socio", atorId: socioId, acao: "criou", entidade: "ideia", entidadeId: id, detalhes: { nome: titulo } }),
  ]);
  return id;
}

export async function marcarIdeia(ideiaId: string, socioId: string, marcador: Marcador | null, titulo: string) {
  if (!marcador) {
    await db.delete(ideiasMarcadores).where(and(eq(ideiasMarcadores.ideiaId, ideiaId), eq(ideiasMarcadores.socioId, socioId)));
    return;
  }
  await db.batch([
    db
      .insert(ideiasMarcadores)
      .values({ ideiaId, socioId, marcador })
      .onConflictDoUpdate({ target: [ideiasMarcadores.ideiaId, ideiasMarcadores.socioId], set: { marcador, criadoEm: new Date() } }),
    db.insert(historico).values({ atorTipo: "socio", atorId: socioId, acao: "aprovou", entidade: "ideia", entidadeId: ideiaId, detalhes: { nome: `${titulo} — ${marcador}` } }),
  ]);
}

export async function mudarSituacaoIdeia(id: string, situacao: "aberta" | "finalizada", socioId: string, titulo: string) {
  await db.batch([
    db
      .update(ideias)
      .set({ situacao, finalizadaEm: situacao === "finalizada" ? new Date() : null, finalizadaPor: situacao === "finalizada" ? socioId : null })
      .where(eq(ideias.id, id)),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: situacao === "finalizada" ? "executou" : "editou",
      entidade: "ideia",
      entidadeId: id,
      detalhes: { nome: `${titulo}${situacao === "finalizada" ? " (finalizada)" : " (reaberta)"}` },
    }),
  ]);
}

/** Os marcadores saem junto (on delete cascade). */
export async function excluirIdeia(id: string, socioId: string, titulo: string) {
  await db.batch([
    db.delete(ideias).where(eq(ideias.id, id)),
    db.insert(historico).values({ atorTipo: "socio", atorId: socioId, acao: "excluiu", entidade: "ideia", detalhes: { nome: titulo } }),
  ]);
}
