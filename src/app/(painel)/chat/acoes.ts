"use server";
// Ações do chat interno. Toda ação confere o login; o texto é validado com Zod.
import { z } from "zod";
import { esquemaMensagem, type Mensagem } from "@/lib/regras/chat";
import { apagarMensagem, contarMensagensNaoLidas, enviarMensagem, listarMensagens, marcarChatLido } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export type ResultadoEnvio = { ok: true; mensagem: Mensagem } | { ok: false; mensagem: string };

export async function acaoEnviarMensagem(dados: unknown): Promise<ResultadoEnvio> {
  const socio = await exigirSocio();
  const r = esquemaMensagem.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Mensagem inválida." };
  try {
    return { ok: true, mensagem: await enviarMensagem(r.data.texto, socio) };
  } catch {
    return { ok: false, mensagem: "Não foi possível enviar. Tente de novo." };
  }
}

/** Busca as mensagens e marca o chat como lido (a tela chama a cada poucos segundos enquanto está aberta). */
export async function acaoAtualizarChat(): Promise<Mensagem[]> {
  const socio = await exigirSocio();
  const [mensagens] = await Promise.all([listarMensagens(), marcarChatLido(socio)]);
  return mensagens;
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
