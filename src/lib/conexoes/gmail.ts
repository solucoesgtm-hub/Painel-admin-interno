// Caixa de e-mail da GTM pelo Gmail (API REST, sem dependência nova).
// Autorização por OAuth com "refresh token": serve para Gmail comum e Google Workspace.
// O token é obtido uma vez com `npm run gmail:autorizar` (passo a passo em docs/CONEXOES.md).
//
// Variáveis (só no servidor):
//   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET → cliente OAuth "App para computador" no Google Cloud
//   GMAIL_REFRESH_TOKEN                 → gerado pelo script
//
// O Hub só LÊ e cria RASCUNHOS. Nada é enviado sem um sócio abrir o Gmail e apertar Enviar.
import "server-only";
import { assuntoResposta, separarRemetente, type DadosRascunho, type EmailResumo } from "../regras/email";
import { lerVariaveis, mensagemDeErro, type Teste } from "./comum";

export const VARIAVEIS_GMAIL = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"] as const;
export const ESCOPO_GMAIL = "https://www.googleapis.com/auth/gmail.modify";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface ProvedorEmail {
  readonly tipo: "gmail" | "demo";
  /** Mensagens recentes da caixa de entrada, mais novas primeiro. */
  listarEntrada(limite?: number): Promise<EmailResumo[]>;
  /** Cria um rascunho de resposta na mesma conversa. Devolve o id do rascunho. */
  criarRascunho(r: DadosRascunho): Promise<string>;
  testar(): Promise<Teste>;
}

/* ---------------- Demonstração ---------------- */
const agoraMenos = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();
const EMAILS_DEMO: EmailResumo[] = [
  { id: "d1", conversaId: "d1", de: "ana.souza@exemplo.com", nomeDe: "Ana Souza (exemplo)", assunto: "Orçamento de atendente no WhatsApp", trecho: "Olá, tenho uma clínica e gostaria de saber quanto custa um atendente automático para marcar consultas.", recebidoEm: agoraMenos(2), lido: false },
  { id: "d2", conversaId: "d2", de: "financeiro@fornecedor-exemplo.com", nomeDe: "Fornecedor (exemplo)", assunto: "Fatura de novembro disponível", trecho: "Sua fatura vence no dia 25. Segue o boleto em anexo.", recebidoEm: agoraMenos(6), lido: false },
  { id: "d3", conversaId: "d3", de: "editais@agencia-exemplo.gov.br", nomeDe: "Agência de fomento (exemplo)", assunto: "Nova chamada pública de inovação", trecho: "Está aberta a chamada pública para soluções digitais em municípios. Prazo de envio em 20 dias.", recebidoEm: agoraMenos(20), lido: true },
  { id: "d4", conversaId: "d4", de: "contato@padaria-exemplo.com", nomeDe: "Padaria São José (exemplo)", assunto: "O atendente não está funcionando", trecho: "Desde ontem o atendente não responde os clientes no WhatsApp. É urgente.", recebidoEm: agoraMenos(1), lido: false },
  { id: "d5", conversaId: "d5", de: "noreply@loja-exemplo.com", nomeDe: "Loja (exemplo)", assunto: "Desconto de Black Friday", trecho: "Ofertas imperdíveis só hoje.", recebidoEm: agoraMenos(30), lido: true },
];

const demo: ProvedorEmail = {
  tipo: "demo",
  async listarEntrada(limite = 20) {
    return EMAILS_DEMO.slice(0, limite);
  },
  async criarRascunho() {
    return `rascunho-demo-${Date.now()}`;
  },
  async testar() {
    return { ok: true, detalhe: "Demonstração: mensagens fictícias, nenhum rascunho é criado de verdade." };
  },
};

/* ---------------- Gmail ---------------- */
let cache: { token: string; expira: number } | null = null;

async function token(v: Record<(typeof VARIAVEIS_GMAIL)[number], string>): Promise<string> {
  const agora = Date.now();
  if (cache && cache.expira - 60_000 > agora) return cache.token;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: v.GMAIL_CLIENT_ID,
      client_secret: v.GMAIL_CLIENT_SECRET,
      refresh_token: v.GMAIL_REFRESH_TOKEN,
    }),
    cache: "no-store",
  });
  if (!r.ok) {
    const corpo = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(
      corpo.error === "invalid_grant"
        ? "Gmail: autorização expirada ou revogada. Rode `npm run gmail:autorizar` de novo."
        : `Gmail recusou a credencial (${r.status}).`,
    );
  }
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cache = { token: j.access_token, expira: agora + j.expires_in * 1000 };
  return j.access_token;
}

function gmail(v: Record<(typeof VARIAVEIS_GMAIL)[number], string>): ProvedorEmail {
  async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(`${API}${caminho}`, {
      ...init,
      headers: { Authorization: `Bearer ${await token(v)}`, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(r.status === 403 ? "Gmail: sem permissão (confira o escopo gmail.modify)." : `Gmail: erro ${r.status}.`);
    return (await r.json()) as T;
  }

  type Cabecalho = { name: string; value: string };
  type Mensagem = { id: string; threadId: string; snippet: string; internalDate: string; labelIds?: string[]; payload?: { headers?: Cabecalho[] } };

  return {
    tipo: "gmail",
    async listarEntrada(limite = 20) {
      const lista = await chamar<{ messages?: { id: string }[] }>(`/messages?maxResults=${Math.min(limite, 50)}&q=${encodeURIComponent("in:inbox newer_than:14d")}`);
      const campos = ["From", "Subject", "Message-ID"].map((h) => `metadataHeaders=${h}`).join("&");
      const msgs = await Promise.all(
        (lista.messages ?? []).map((m) => chamar<Mensagem>(`/messages/${m.id}?format=metadata&${campos}`)),
      );
      return msgs.map((m) => {
        const cab = (n: string) => m.payload?.headers?.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? "";
        const { nome, email } = separarRemetente(cab("From"));
        return {
          id: m.id,
          conversaId: m.threadId,
          de: email,
          nomeDe: nome,
          assunto: cab("Subject") || "(sem assunto)",
          trecho: m.snippet ?? "",
          recebidoEm: new Date(Number(m.internalDate)).toISOString(),
          lido: !(m.labelIds ?? []).includes("UNREAD"),
          mensagemId: cab("Message-ID") || undefined,
        };
      });
    },
    async criarRascunho(r) {
      const assunto = assuntoResposta(r.assunto);
      const linhas = [
        `To: ${r.para}`,
        `Subject: =?UTF-8?B?${Buffer.from(assunto).toString("base64")}?=`,
        ...(r.mensagemId ? [`In-Reply-To: ${r.mensagemId}`, `References: ${r.mensagemId}`] : []),
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(r.corpo).toString("base64"),
      ];
      const raw = Buffer.from(linhas.join("\r\n")).toString("base64url");
      const d = await chamar<{ id: string }>("/drafts", { method: "POST", body: JSON.stringify({ message: { raw, threadId: r.conversaId } }) });
      return d.id;
    },
    async testar() {
      try {
        const p = await chamar<{ emailAddress: string; messagesTotal: number }>("/profile");
        return { ok: true, detalhe: `Conectado a ${p.emailAddress}.` };
      } catch (e) {
        return { ok: false, detalhe: mensagemDeErro(e, "Não foi possível falar com o Gmail.") };
      }
    },
  };
}

/** Provedor em uso: o Gmail quando as três variáveis existem; senão, a demonstração. */
export function provedorEmail(): ProvedorEmail {
  const { valores } = lerVariaveis(VARIAVEIS_GMAIL);
  return valores ? gmail(valores) : demo;
}
