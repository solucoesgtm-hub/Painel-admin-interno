// Consultas de "Nossa empresa": dados cadastrais e contratos.
// Toda alteração grava também uma linha no histórico, no mesmo lote.
import { asc, eq } from "drizzle-orm";
import { db } from "../index";
import { contratos, empresa, historico } from "../schema";

const ID_EMPRESA = "gtm";

export async function buscarEmpresa() {
  return db.query.empresa.findFirst({ where: eq(empresa.id, ID_EMPRESA) });
}

type CamposEmpresa = Omit<typeof empresa.$inferInsert, "id" | "atualizadoPor" | "atualizadoEm">;

/** Cria a linha na primeira vez e atualiza nas seguintes. */
export async function salvarEmpresa(dados: CamposEmpresa, socioId: string, campos: string[]) {
  await db.batch([
    db
      .insert(empresa)
      .values({ id: ID_EMPRESA, ...dados, atualizadoPor: socioId })
      .onConflictDoUpdate({ target: empresa.id, set: { ...dados, atualizadoPor: socioId, atualizadoEm: new Date() } }),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "editou",
      entidade: "empresa",
      detalhes: { nome: "Dados da empresa", campos },
    }),
  ]);
}

export async function listarContratos() {
  return db.select().from(contratos).orderBy(asc(contratos.fim));
}

type CamposContrato = Omit<typeof contratos.$inferInsert, "id" | "criadoPor" | "criadoEm" | "atualizadoEm">;

export async function criarContrato(dados: CamposContrato, socioId: string) {
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(contratos).values({ ...dados, id, criadoPor: socioId }),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "criou",
      entidade: "contrato",
      entidadeId: id,
      detalhes: { nome: `Contrato — ${dados.cliente}` },
    }),
  ]);
  return id;
}

export async function atualizarContrato(id: string, dados: CamposContrato, socioId: string, descricao: string) {
  await db.batch([
    db.update(contratos).set(dados).where(eq(contratos.id, id)),
    db.insert(historico).values({
      atorTipo: "socio",
      atorId: socioId,
      acao: "editou",
      entidade: "contrato",
      entidadeId: id,
      detalhes: { nome: descricao, situacao: dados.situacao },
    }),
  ]);
}
