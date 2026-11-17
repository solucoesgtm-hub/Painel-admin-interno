// Regras do chat interno dos sócios e do bloqueio de login.
import { z } from "zod";

export const TAMANHO_MAX_MENSAGEM = 2000;
/** Depois deste tempo a mensagem não pode mais ser apagada pelo autor. */
export const MINUTOS_PARA_APAGAR = 15;

export const esquemaMensagem = z.object({
  texto: z
    .string()
    .transform((t) => t.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim())
    .pipe(z.string().min(1, "Escreva uma mensagem.").max(TAMANHO_MAX_MENSAGEM, `Use no máximo ${TAMANHO_MAX_MENSAGEM} caracteres.`)),
});

export type Mensagem = {
  id: string;
  autorId: string;
  texto: string; // "" quando apagada
  apagada: boolean;
  em: string; // ISO
};

export function podeApagar(m: Pick<Mensagem, "autorId" | "apagada" | "em">, socioId: string, agora = new Date()): boolean {
  if (m.apagada || m.autorId !== socioId) return false;
  return agora.getTime() - new Date(m.em).getTime() <= MINUTOS_PARA_APAGAR * 60_000;
}

/** Junta mensagens seguidas do mesmo autor (até 5 min) para mostrar o nome uma vez só. */
export function continuaBloco(anterior: Pick<Mensagem, "autorId" | "em"> | undefined, atual: Pick<Mensagem, "autorId" | "em">): boolean {
  if (!anterior || anterior.autorId !== atual.autorId) return false;
  return new Date(atual.em).getTime() - new Date(anterior.em).getTime() < 5 * 60_000;
}

/** Separa o texto em trechos comuns e links http(s), para a tela montar <a> sem HTML cru. */
export function partesComLinks(texto: string): { tipo: "texto" | "link"; valor: string }[] {
  const partes: { tipo: "texto" | "link"; valor: string }[] = [];
  const re = /https?:\/\/[^\s<>"']+/g;
  let ultimo = 0;
  for (const m of texto.matchAll(re)) {
    const url = m[0].replace(/[.,;:!?)\]]+$/, "");
    const inicio = m.index ?? 0;
    if (inicio > ultimo) partes.push({ tipo: "texto", valor: texto.slice(ultimo, inicio) });
    partes.push({ tipo: "link", valor: url });
    ultimo = inicio + url.length;
  }
  if (ultimo < texto.length) partes.push({ tipo: "texto", valor: texto.slice(ultimo) });
  return partes;
}

/* ---------------- Bloqueio de login ---------------- */
export const LOGIN_MAX_TENTATIVAS = 5;
export const LOGIN_JANELA_MINUTOS = 15;

/** Bloqueia quando há tentativas recusadas demais dentro da janela. */
export const loginBloqueado = (recusadasNaJanela: number) => recusadasNaJanela >= LOGIN_MAX_TENTATIVAS;
