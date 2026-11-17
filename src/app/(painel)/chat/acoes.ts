"use server";
// Ações do chat interno. Toda ação confere o login; o texto é validado com Zod.
import { z } from "zod";
import { after } from "next/server";
import { esquemaInscricao, esquemaMensagem, type Mensagem } from "@/lib/regras/chat";
import {
  apagarMensagem,
  buscarMudancasChat,
  contarMensagensNaoLidas,
  enviarMensagem,
  listarMensagens,
  listarSocios,
  marcarChatLido,
  notificarMensagem,
  removerInscricaoPush,
  salvarInscricaoPush,
  testarPush,
} from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export type ResultadoEnvio = { ok: true; mensagem: Mensagem } | { ok: false; mensagem: string };

export async function acaoEnviarMensagem(dados: unknown): Promise<ResultadoEnvio> {
  const socio = await exigirSocio();
  const r = esquemaMensagem.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Mensagem inválida." };
  try {
    const mensagem = await enviarMensagem(r.data.texto, socio);
    // Avisa os outros sócios depois de responder (não atrasa o envio).
    after(() => notificarMensagem(socio, r.data.texto).catch((e) => console.warn("[push]", e)));
    return { ok: true, mensagem };
  } catch {
    return { ok: false, mensagem: "Não foi possível enviar. Tente de novo." };
  }
}

/**
 * Atualização incremental: só o que mudou desde `cursor`. Sem novidade, volta lista vazia
 * (resposta mínima). Só grava "lido" quando chegou mensagem de outro sócio.
 */
export async function acaoAtualizarChat(cursor: unknown): Promise<{ mensagens: Mensagem[]; cursor: string }> {
  const socio = await exigirSocio();
  const r = z.string().datetime().safeParse(cursor);
  if (!r.success) {
    // Cursor inválido: devolve a lista completa e recomeça.
    const [mensagens] = await Promise.all([listarMensagens(), marcarChatLido(socio)]);
    return { mensagens, cursor: new Date().toISOString() };
  }
  const mudancas = await buscarMudancasChat(r.data);
  if (mudancas.mensagens.some((m) => m.autorId !== socio.id && !m.apagada)) await marcarChatLido(socio);
  return mudancas;
}

export async function acaoApagarMensagem(id: unknown): Promise<{ ok: boolean; mensagem?: string }> {
  const socio = await exigirSocio();
  const r = z.string().min(1).max(64).safeParse(id);
  if (!r.success) return { ok: false, mensagem: "Mensagem inválida." };
  const apagou = await apagarMensagem(r.data, socio);
  return apagou ? { ok: true } : { ok: false, mensagem: "Só dá para apagar a própria mensagem, até 15 minutos depois de enviar." };
}

/** Contador do ícone de chat no topo. */
export async function acaoContarNaoLidas(): Promise<number> {
  const socio = await exigirSocio();
  return contarMensagensNaoLidas(socio);
}

/** "Visto por último" de todos os sócios (para o chat e a Equipe, conferido a cada minuto). */
export async function acaoPresenca(): Promise<{ id: string; vistoEm: string | null }[]> {
  await exigirSocio();
  return (await listarSocios()).map((s) => ({ id: s.id, vistoEm: s.vistoEm ?? null }));
}

/* ---------------- Notificações ---------------- */
export async function acaoAtivarNotificacoes(dados: unknown): Promise<{ ok: boolean; mensagem?: string }> {
  const socio = await exigirSocio();
  const r = esquemaInscricao.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Inscrição inválida." };
  try {
    await salvarInscricaoPush(socio, { endpoint: r.data.endpoint, p256dh: r.data.keys.p256dh, auth: r.data.keys.auth }, r.data.aparelho);
    return { ok: true };
  } catch {
    return { ok: false, mensagem: "Não foi possível ativar. Tente de novo." };
  }
}

export async function acaoDesativarNotificacoes(endpoint: unknown): Promise<{ ok: boolean }> {
  await exigirSocio();
  const r = z.string().max(1000).safeParse(endpoint);
  if (r.success) await removerInscricaoPush(r.data).catch(() => {});
  return { ok: true };
}

export async function acaoTestarNotificacao(): Promise<{ ok: boolean; aparelhos: number }> {
  const socio = await exigirSocio();
  const aparelhos = await testarPush(socio).catch(() => 0);
  return { ok: aparelhos > 0, aparelhos };
}
