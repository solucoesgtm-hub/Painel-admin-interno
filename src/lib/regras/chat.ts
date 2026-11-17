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

/* ---------------- Atualização do chat (economia de banco) ---------------- */
export const INTERVALO_MIN_MS = 4_000;
export const INTERVALO_MAX_MS = 30_000;
/** Sem mexer no painel por este tempo, as consultas param até o próximo movimento. */
export const PAUSA_SEM_USO_MS = 15 * 60_000;

/** Com novidade, volta a 4 s; sem novidade, espaça 1,5× até 30 s. */
export function proximoIntervalo(atual: number, houveNovidade: boolean): number {
  if (houveNovidade) return INTERVALO_MIN_MS;
  return Math.min(INTERVALO_MAX_MS, Math.round(atual * 1.5));
}

export const semUsoHaMuito = (ultimoUso: number, agora = Date.now()) => agora - ultimoUso >= PAUSA_SEM_USO_MS;

/** Junta as mudanças do servidor à lista local: substitui pelo id e mantém a ordem por data. */
export function juntarMensagens<T extends { id: string; em: string }>(atuais: T[], mudancas: T[]): T[] {
  if (!mudancas.length) return atuais;
  const porId = new Map(atuais.map((m) => [m.id, m]));
  for (const m of mudancas) porId.set(m.id, m);
  return [...porId.values()].sort((a, b) => a.em.localeCompare(b.em));
}
