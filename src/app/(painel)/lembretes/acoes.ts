"use server";
// Aba Lembretes: criar lembretes/tarefas (soltos, num assunto ou num projeto), marcar, editar e excluir.
import { revalidatePath } from "next/cache";
import { esquemaEditarItem, esquemaIdItem, esquemaItem, esquemaMarcarItem, MAX_LEMBRETES, MAX_POR_GRUPO } from "@/lib/regras/lembretes";
import { alterarItem, atualizarItem, buscarProjeto, contarNoGrupo, criarItem, listarSocios } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export type RespostaItem = { ok: true; id?: string } | { ok: false; mensagem: string; erros?: Record<string, string> };

const atualizar = () => {
  revalidatePath("/lembretes");
  revalidatePath("/projetos");
  revalidatePath("/agenda");
};

export async function acaoCriarItem(dados: unknown): Promise<RespostaItem> {
  return salvarItem(null, dados);
}

/** Edição completa: texto, tipo, vínculo, responsável e prazo. */
export async function acaoAtualizarItem(id: unknown, dados: unknown): Promise<RespostaItem> {
  const r = esquemaIdItem.safeParse({ id });
  if (!r.success) return { ok: false, mensagem: "Item inválido." };
  return salvarItem(r.data.id, dados);
}

async function salvarItem(idExistente: string | null, dados: unknown): Promise<RespostaItem> {
  const socio = await exigirSocio();
  const r = esquemaItem.safeParse(dados);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { ok: false, erros, mensagem: Object.values(erros)[0] ?? "Confira os campos." };
  }
  const d = r.data;
  try {
    let projetoNome: string | null = null;
    if (d.projetoId) {
      const p = await buscarProjeto(d.projetoId);
      if (!p) return { ok: false, mensagem: "Projeto não encontrado.", erros: { projetoId: "Projeto não encontrado." } };
      projetoNome = p.nome;
    }
    if (d.responsavelId && !(await listarSocios()).some((s) => s.id === d.responsavelId)) {
      return { ok: false, mensagem: "Responsável inválido.", erros: { responsavelId: "Escolha um sócio." } };
    }
    const limite = d.projetoId ? MAX_LEMBRETES : MAX_POR_GRUPO;
    if ((await contarNoGrupo(d, idExistente ?? undefined)) >= limite) return { ok: false, mensagem: `Este grupo já tem ${limite} itens. Conclua ou exclua algum antes.` };
    if (idExistente) {
      if (!(await atualizarItem(idExistente, d, socio, projetoNome))) return { ok: false, mensagem: "Item não encontrado." };
      atualizar();
      return { ok: true, id: idExistente };
    }
    const id = await criarItem(d, socio, projetoNome);
    atualizar();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
}

async function alterar(id: string, mudanca: Parameters<typeof alterarItem>[1]): Promise<RespostaItem> {
  const socio = await exigirSocio();
  try {
    if (!(await alterarItem(id, mudanca, socio))) return { ok: false, mensagem: "Item não encontrado." };
    atualizar();
    return { ok: true };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível atualizar." };
  }
}

export async function acaoMarcarItem(dados: unknown): Promise<RespostaItem> {
  const r = esquemaMarcarItem.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: "Dados inválidos." };
  return alterar(r.data.id, { tipo: "marcar", feito: r.data.feito });
}

export async function acaoEditarItem(dados: unknown): Promise<RespostaItem> {
  const r = esquemaEditarItem.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Texto inválido." };
  return alterar(r.data.id, { tipo: "editar", texto: r.data.texto });
}

export async function acaoExcluirItem(dados: unknown): Promise<RespostaItem> {
  const r = esquemaIdItem.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: "Dados inválidos." };
  return alterar(r.data.id, { tipo: "excluir" });
}
