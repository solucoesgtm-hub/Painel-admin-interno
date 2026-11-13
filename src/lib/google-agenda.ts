// Google Agenda por conta de serviço (sem dependência nova): o Hub assina um JWT com a chave
// da conta, troca por um token de acesso e usa a API REST do Calendar.
// A agenda da GTM precisa estar compartilhada com o e-mail da conta de serviço,
// com a permissão "Fazer alterações nos eventos".
//
// Variáveis (só no servidor):
//   GOOGLE_AGENDA_ID           → id da agenda (Configurações da agenda → "ID da agenda")
//   GOOGLE_AGENDA_CREDENCIAIS  → o JSON inteiro da chave da conta de serviço
import "server-only";
import { createSign } from "node:crypto";
import type { Evento } from "./demo/dados";
import { AGENDA_GTM, partesHorario, TIPOS_EVENTO, type DadosEvento, type TipoEvento } from "./regras/agenda";

const ESCOPO = "https://www.googleapis.com/auth/calendar.events";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";
const FUSO = "America/Sao_Paulo";

type Credenciais = { client_email: string; private_key: string };

function credenciais(): { agendaId: string; conta: Credenciais } | null {
  const agendaId = process.env.GOOGLE_AGENDA_ID?.trim();
  const json = process.env.GOOGLE_AGENDA_CREDENCIAIS?.trim();
  if (!agendaId || !json) return null;
  try {
    const c = JSON.parse(json) as Partial<Credenciais>;
    if (!c.client_email || !c.private_key) return null;
    return { agendaId, conta: { client_email: c.client_email, private_key: c.private_key.replace(/\\n/g, "\n") } };
  } catch {
    return null;
  }
}

export const googleAgendaLigado = () => credenciais() !== null;

/** E-mail da conta de serviço (para mostrar com quem compartilhar a agenda). */
export const emailContaServico = () => credenciais()?.conta.client_email ?? null;

const b64url = (v: string | Buffer) => Buffer.from(v).toString("base64url");

let cache: { token: string; expira: number } | null = null;

async function token(conta: Credenciais): Promise<string> {
  const agora = Math.floor(Date.now() / 1000);
  if (cache && cache.expira - 60 > agora) return cache.token;
  const cabecalho = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const corpo = b64url(JSON.stringify({ iss: conta.client_email, scope: ESCOPO, aud: URL_TOKEN, iat: agora, exp: agora + 3600 }));
  const assinatura = createSign("RSA-SHA256").update(`${cabecalho}.${corpo}`).sign(conta.private_key);
  const r = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cabecalho}.${corpo}.${b64url(assinatura)}`,
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Google recusou a credencial (${r.status}).`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cache = { token: j.access_token, expira: agora + j.expires_in };
  return j.access_token;
}

async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const c = credenciais();
  if (!c) throw new Error("Google Agenda não configurado.");
  const r = await fetch(`${API}/calendars/${encodeURIComponent(c.agendaId)}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token(c.conta)}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!r.ok) {
    const motivo = r.status === 404 ? "agenda não encontrada ou não compartilhada com a conta de serviço" : `erro ${r.status}`;
    throw new Error(`Google Agenda: ${motivo}.`);
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}

type EventoGoogle = {
  id: string;
  status?: string;
  summary?: string;
  htmlLink?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
};

/** Eventos entre duas datas (aaaa-mm-dd), já expandidos (recorrências viram ocorrências). */
export async function listarEventosGoogle(de: string, ate: string): Promise<Evento[]> {
  const q = new URLSearchParams({
    timeMin: `${de}T00:00:00-03:00`,
    timeMax: `${ate}T23:59:59-03:00`,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "500",
    timeZone: FUSO,
  });
  const r = await chamar<{ items?: EventoGoogle[] }>(`/events?${q}`);
  return (r.items ?? [])
    .filter((e) => e.status !== "cancelled")
    .map((e) => {
      const ini = partesHorario(e.start);
      const fim = partesHorario(e.end);
      const priv = e.extendedProperties?.private ?? {};
      const tipo = (TIPOS_EVENTO as readonly string[]).includes(priv.gtmTipo ?? "") ? (priv.gtmTipo as TipoEvento) : "reuniao";
      return {
        id: e.id,
        titulo: e.summary?.trim() || "(sem título)",
        data: ini.data,
        inicio: ini.hora || "dia todo",
        fim: ini.hora ? fim.hora : "",
        socioId: priv.gtmSocio || AGENDA_GTM,
        tipo,
        link: e.htmlLink,
      };
    });
}

/** Cria o evento na agenda da GTM, marcando tipo e sócio para o Hub reconhecer depois. */
export async function criarEventoGoogle(e: DadosEvento): Promise<string> {
  const r = await chamar<{ id: string }>("/events", {
    method: "POST",
    body: JSON.stringify({
      summary: e.titulo,
      description: e.descricao || undefined,
      start: { dateTime: `${e.data}T${e.inicio}:00`, timeZone: FUSO },
      end: { dateTime: `${e.data}T${e.fim}:00`, timeZone: FUSO },
      extendedProperties: { private: { gtmTipo: e.tipo, gtmSocio: e.socioId, origem: "gtm-hub" } },
    }),
  });
  return r.id;
}

export async function excluirEventoGoogle(id: string): Promise<void> {
  await chamar<void>(`/events/${encodeURIComponent(id)}`, { method: "DELETE" });
}
