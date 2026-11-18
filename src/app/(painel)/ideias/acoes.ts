"use server";
// Mural de ideias: publicar, marcar opinião (só nas ideias dos outros), finalizar/reabrir e excluir.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { esquemaIdeia, esquemaMarcar, esquemaSituacao } from "@/lib/regras/ideias";
import { buscarIdeia, criarIdeia, excluirIdeia, marcarIdeia, mudarSituacaoIdeia } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

type Resposta = { ok: true; id?: string } | { ok: false; mensagem: string; erros?: Record<string, string> };
const falha = (e: unknown, padrao: string): Resposta => ({ ok: false, mensagem: e instanceof Error ? e.message : padrao });

export async function acaoCriarIdeia(dados: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = esquemaIdeia.safeParse(dados);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { ok: false, mensagem: Object.values(erros)[0] ?? "Confira os campos.", erros };
  }
  try {
    const id = await criarIdeia(r.data.titulo, r.data.texto, socio);
    revalidatePath("/ideias");
    return { ok: true, id };
  } catch (e) {
    return falha(e, "Não foi possível publicar a ideia.");
  }
}

export async function acaoMarcarIdeia(dados: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = esquemaMarcar.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: "Marcador inválido." };
  try {
    const ideia = await buscarIdeia(r.data.ideiaId);
    if (!ideia) return { ok: false, mensagem: "Ideia não encontrada." };
    if (ideia.autorId === socio.id) return { ok: false, mensagem: "Os outros sócios é que dão opinião na sua ideia." };
    if (ideia.situacao === "finalizada") return { ok: false, mensagem: "Ideia finalizada: reabra para opinar." };
    await marcarIdeia(ideia, socio, r.data.marcador);
    revalidatePath("/ideias");
    return { ok: true };
  } catch (e) {
    return falha(e, "Não foi possível salvar a opinião.");
  }
}

export async function acaoSituacaoIdeia(dados: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = esquemaSituacao.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: "Dados inválidos." };
  try {
    const ideia = await buscarIdeia(r.data.ideiaId);
    if (!ideia) return { ok: false, mensagem: "Ideia não encontrada." };
    await mudarSituacaoIdeia(ideia, r.data.situacao, socio);
    revalidatePath("/ideias");
    return { ok: true };
  } catch (e) {
    return falha(e, "Não foi possível atualizar a ideia.");
  }
}

export async function acaoExcluirIdeia(id: unknown): Promise<Resposta> {
  const socio = await exigirSocio();
  const r = z.string().min(1).max(64).safeParse(id);
  if (!r.success) return { ok: false, mensagem: "Ideia inválida." };
  try {
    const ideia = await buscarIdeia(r.data);
    if (!ideia) return { ok: false, mensagem: "Ideia não encontrada." };
    await excluirIdeia(ideia, socio);
    revalidatePath("/ideias");
    return { ok: true };
  } catch (e) {
    return falha(e, "Não foi possível excluir a ideia.");
  }
}
