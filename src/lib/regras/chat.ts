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

/* ---------------- Presença ("visto por último") ---------------- */
/** Considerado online se usou o painel nos últimos 3 minutos (as consultas do painel renovam isso). */
export const ONLINE_MS = 3 * 60_000;
/** Grava "visto" no máximo uma vez por minuto por sócio, para não escrever no banco a cada clique. */
export const GRAVAR_VISTO_MS = 60_000;

export const estaOnline = (vistoEm: string | null | undefined, agora = new Date()) =>
  !!vistoEm && agora.getTime() - new Date(vistoEm).getTime() < ONLINE_MS;

export const deveGravarVisto = (vistoEm: string | null | undefined, agora = new Date()) =>
  !vistoEm || agora.getTime() - new Date(vistoEm).getTime() >= GRAVAR_VISTO_MS;

const FUSO_SP = "America/Sao_Paulo";
const diaSP = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: FUSO_SP });
const horaSP = (d: Date) => d.toLocaleTimeString("pt-BR", { timeZone: FUSO_SP, hour: "2-digit", minute: "2-digit" });

/** "Online agora", "Visto há 12 min", "Visto hoje às 14:32", "Visto ontem às 18:05", "Visto em 03/11 às 09:10". */
export function textoVisto(vistoEm: string | null | undefined, agora = new Date()): string {
  if (!vistoEm) return "Ainda não acessou";
  const v = new Date(vistoEm);
  const ms = agora.getTime() - v.getTime();
  if (ms < ONLINE_MS) return "Online agora";
  if (ms < 60 * 60_000) return `Visto há ${Math.max(1, Math.floor(ms / 60_000))} min`;
  const hoje = diaSP(agora);
  const ontem = diaSP(new Date(agora.getTime() - 24 * 60 * 60_000));
  const dia = diaSP(v);
  if (dia === hoje) return `Visto hoje às ${horaSP(v)}`;
  if (dia === ontem) return `Visto ontem às ${horaSP(v)}`;
  const dm = v.toLocaleDateString("pt-BR", { timeZone: FUSO_SP, day: "2-digit", month: "2-digit" });
  return `Visto em ${dm} às ${horaSP(v)}`;
}

/* ---------------- Notificações (Web Push) ---------------- */
/** Só serviços oficiais de push: o servidor nunca envia requisições para endereços arbitrários. */
const SERVICOS_PUSH = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "push.apple.com", "notify.windows.com"];

export const servicoPushPermitido = (endpoint: string) => {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && SERVICOS_PUSH.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
};

export const esquemaInscricao = z.object({
  endpoint: z.string().max(1000).refine(servicoPushPermitido, "Serviço de notificação não reconhecido."),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
  aparelho: z.string().max(120).optional().default(""),
});

/** Texto da notificação: nome de quem mandou e o começo da mensagem. */
export function avisoDeMensagem(autor: string, texto: string, naoLidas: number) {
  const curto = texto.replace(/\s+/g, " ").trim();
  return {
    titulo: `${autor} · Chat GTM`,
    texto: curto.length > 140 ? `${curto.slice(0, 137)}…` : curto,
    url: "/chat",
    naoLidas,
  };
}
