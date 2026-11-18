// Projetos. Toda alteração grava no histórico no mesmo lote.
import { asc, eq } from "drizzle-orm";
import { db } from "../index";
import { historico, projetos } from "../schema";

type Campos = {
  nome: string;
  cliente: string;
  leadId: string | null;
  situacao: (typeof projetos.$inferInsert)["situacao"];
  donoId: string | null;
  prazo: string;
  repositorio: string;
  descricao: string;
};

export async function listarProjetos() {
  return db.select().from(projetos).orderBy(asc(projetos.prazo));
}

export async function buscarProjeto(id: string) {
  const [p] = await db.select().from(projetos).where(eq(projetos.id, id));
  return p ?? null;
}

export async function criarProjeto(dados: Campos, socioId: string) {
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(projetos).values({ ...dados, id, criadoPor: socioId }),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "criou",
      entidade: "projeto",
      entidadeId: id,
      detalhes: { nome: `${dados.nome} — ${dados.cliente}` },
    }),
  ]);
  return id;
}

export async function editarProjeto(id: string, dados: Campos, socioId: string, mudouSituacao: string | null) {
  await db.batch([
    db.update(projetos).set({ ...dados, atualizadoEm: new Date() }).where(eq(projetos.id, id)),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "editou",
      entidade: "projeto",
      entidadeId: id,
      detalhes: { nome: `${dados.nome}${mudouSituacao ? ` → ${mudouSituacao}` : ""}` },
    }),
  ]);
}

/** Os lembretes saem junto (on delete cascade). */
export async function excluirProjeto(id: string, nome: string, socioId: string) {
  await db.batch([
    db.delete(projetos).where(eq(projetos.id, id)),
    db.insert(historico).values({ atorTipo: "socio", atorId: socioId, acao: "excluiu", entidade: "projeto", detalhes: { nome } }),
  ]);
}
