"use server";
// Projetos e lembretes: criar, editar, excluir e marcar como feito. Tudo fica no histórico.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { esquemaEditarLembrete, esquemaExcluirLembrete, esquemaMarcarLembrete, esquemaNovoLembrete, MAX_LEMBRETES } from "@/lib/regras/lembretes";
import { esquemaProjeto } from "@/lib/regras/projetos";
import {
  buscarProjeto,
  contarLembretes,
  criarLembrete,
  criarProjeto,
  editarLembrete,
  editarProjeto,
  excluirLembrete,
  excluirProjeto,
  marcarLembrete,
} from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

type Resposta = { ok: true; id?: string } | { ok: false; mensagem: string };

const projetoPorId = (id: string) => buscarProjeto(id);

export async function acaoCriarLembrete(dados: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = esquemaNovoLembrete.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Lembrete inválido." };
  const projeto = await projetoPorId(r.data.projetoId);
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
  const projeto = await projetoPorId(r.data.projetoId);
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
  const projeto = await projetoPorId(r.data.projetoId);
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
  const projeto = await projetoPorId(r.data.projetoId);
  if (!projeto) return { ok: false, mensagem: "Projeto não encontrado." };
  try {
    if (!(await excluirLembrete(r.data.id, projeto, socio))) return { ok: false, mensagem: "Lembrete não encontrado." };
    revalidatePath("/projetos");
    return { ok: true };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível excluir o lembrete." };
  }
}

export type RespostaProjeto = { ok: true; id: string } | { ok: false; erros: Record<string, string>; mensagem: string };

const esquemaSalvar = esquemaProjeto.extend({ id: z.string().max(64).optional().or(z.literal("")) });

export async function acaoSalvarProjeto(dados: unknown): Promise<RespostaProjeto> {
  const socio = await exigirSocio();
  const r = esquemaSalvar.safeParse(dados);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { ok: false, erros, mensagem: "Confira os campos destacados." };
  }
  const { id, ...campos } = r.data;
  try {
    if (id) {
      if (!(await editarProjeto(id, campos, socio))) return { ok: false, erros: {}, mensagem: "Projeto não encontrado." };
      revalidatePath("/projetos");
      return { ok: true, id };
    }
    const novo = await criarProjeto(campos, socio);
    revalidatePath("/projetos");
    return { ok: true, id: novo };
  } catch (e) {
    return { ok: false, erros: {}, mensagem: e instanceof Error ? e.message : "Não foi possível salvar o projeto." };
  }
}

export async function acaoExcluirProjeto(id: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = z.string().min(1).max(64).safeParse(id);
  if (!r.success) return { ok: false, mensagem: "Projeto inválido." };
  try {
    if (!(await excluirProjeto(r.data, socio))) return { ok: false, mensagem: "Projeto não encontrado." };
    revalidatePath("/projetos");
    return { ok: true };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível excluir o projeto." };
  }
}
