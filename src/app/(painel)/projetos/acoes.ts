"use server";
// Lembretes dos projetos: criar e marcar como feito (ou reabrir). Ficam no histórico.
import { revalidatePath } from "next/cache";
import { PROJETOS } from "@/lib/demo/dados";
import { esquemaEditarLembrete, esquemaExcluirLembrete, esquemaMarcarLembrete, esquemaNovoLembrete, MAX_LEMBRETES } from "@/lib/regras/lembretes";
import { contarLembretes, criarLembrete, editarLembrete, excluirLembrete, marcarLembrete } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

type Resposta = { ok: true; id?: string } | { ok: false; mensagem: string };

const projetoPorId = (id: string) => PROJETOS.find((p) => p.id === id);

export async function acaoCriarLembrete(dados: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = esquemaNovoLembrete.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Lembrete inválido." };
  const projeto = projetoPorId(r.data.projetoId);
  if (!projeto) return { ok: false, mensagem: "Projeto não encontrado." };
  try {
    if ((await contarLembretes(projeto.id)) >= MAX_LEMBRETES) return { ok: false, mensagem: `Cada projeto tem no máximo ${MAX_LEMBRETES} lembretes.` };
    const id = await criarLembrete(projeto, r.data.texto, socio);
    revalidatePath("/projetos");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível salvar o lembrete." };
  }
}

export async function acaoMarcarLembrete(dados: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = esquemaMarcarLembrete.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: "Dados inválidos." };
  const projeto = projetoPorId(r.data.projetoId);
  if (!projeto) return { ok: false, mensagem: "Projeto não encontrado." };
  try {
    const ok = await marcarLembrete(r.data.id, projeto, r.data.feito, socio);
    if (!ok) return { ok: false, mensagem: "Lembrete não encontrado." };
    revalidatePath("/projetos");
    return { ok: true };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível atualizar o lembrete." };
  }
}

export async function acaoEditarLembrete(dados: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = esquemaEditarLembrete.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Lembrete inválido." };
  const projeto = projetoPorId(r.data.projetoId);
  if (!projeto) return { ok: false, mensagem: "Projeto não encontrado." };
  try {
    if (!(await editarLembrete(r.data.id, projeto, r.data.texto, socio))) return { ok: false, mensagem: "Lembrete não encontrado." };
    revalidatePath("/projetos");
    return { ok: true };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível editar o lembrete." };
  }
}

export async function acaoExcluirLembrete(dados: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = esquemaExcluirLembrete.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: "Dados inválidos." };
  const projeto = projetoPorId(r.data.projetoId);
  if (!projeto) return { ok: false, mensagem: "Projeto não encontrado." };
  try {
    if (!(await excluirLembrete(r.data.id, projeto, socio))) return { ok: false, mensagem: "Lembrete não encontrado." };
    revalidatePath("/projetos");
    return { ok: true };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível excluir o lembrete." };
  }
}
