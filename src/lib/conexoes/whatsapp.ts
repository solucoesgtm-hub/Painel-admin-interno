// WhatsApp Business pela Cloud API da Meta (Graph API, sem dependência nova).
// Envio de mensagens e recepção por webhook (src/app/api/whatsapp/webhook/route.ts).
//
// Variáveis (só no servidor):
//   WHATSAPP_TOKEN          → token permanente de um "usuário do sistema" no Gerenciador de Negócios
//   WHATSAPP_NUMERO_ID      → "Phone number ID" do número na Meta (não é o telefone)
//   META_APP_SECRET         → chave secreta do app (confere a assinatura dos webhooks)
//   WHATSAPP_VERIFY_TOKEN   → texto livre, o mesmo informado ao cadastrar o webhook na Meta
//   META_GRAPH_VERSAO       → opcional, versão da Graph API (padrão abaixo)
//
// Regras da Meta: fora da janela de 24 h desde a última mensagem do cliente, só modelos aprovados.
// No Hub, nenhum envio sai sozinho: tudo passa por um sócio (caixa de aprovações).
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { lerVariaveis, mensagemDeErro, type Teste } from "./comum";

export const VARIAVEIS_WHATSAPP = ["WHATSAPP_TOKEN", "WHATSAPP_NUMERO_ID", "META_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"] as const;
const versao = () => process.env.META_GRAPH_VERSAO?.trim() || "v23.0";

export type Envio = { ok: true; id: string } | { ok: false; erro: string };

export interface ProvedorWhatsApp {
  readonly tipo: "meta" | "demo";
  /** Texto livre: só funciona dentro da janela de 24 h. `para` no formato 5527999998888. */
  enviarTexto(para: string, texto: string): Promise<Envio>;
  /** Modelo aprovado na Meta (necessário fora da janela de 24 h). */
  enviarModelo(para: string, modelo: string, parametros?: string[], idioma?: string): Promise<Envio>;
  testar(): Promise<Teste>;
}

/** Só dígitos, com DDI 55 quando faltar. */
export function normalizarTelefone(t: string): string {
  const d = t.replace(/\D/g, "");
  return d.length <= 11 ? `55${d}` : d;
}

/** Confere o cabeçalho X-Hub-Signature-256 do webhook com a chave secreta do app. */
export function assinaturaValida(corpoBruto: string, assinatura: string | null): boolean {
  const segredo = process.env.META_APP_SECRET?.trim();
  if (!segredo || !assinatura?.startsWith("sha256=")) return false;
  const esperado = Buffer.from(createHmac("sha256", segredo).update(corpoBruto, "utf8").digest("hex"));
  const recebido = Buffer.from(assinatura.slice(7));
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

/* ---------------- Demonstração ---------------- */
const demo: ProvedorWhatsApp = {
  tipo: "demo",
  async enviarTexto() {
    return { ok: true, id: `demo-${Date.now()}` };
  },
  async enviarModelo() {
    return { ok: true, id: `demo-${Date.now()}` };
  },
  async testar() {
    return { ok: true, detalhe: "Demonstração: nenhuma mensagem sai de verdade." };
  },
};

/* ---------------- Meta (Cloud API) ---------------- */
function meta(v: Record<(typeof VARIAVEIS_WHATSAPP)[number], string>): ProvedorWhatsApp {
  const api = `https://graph.facebook.com/${versao()}`;
  async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(`${api}${caminho}`, {
      ...init,
      // Tempo-limite: serviço externo lento não pode travar a tela.
      signal: init.signal ?? AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${v.WHATSAPP_TOKEN}`, "Content-Type": "application/json", ...init.headers },
      cache: "no-store",
    });
    const j = (await r.json().catch(() => ({}))) as T & { error?: { message?: string; code?: number } };
    if (!r.ok) throw new Error(`Meta: ${j.error?.message ?? `erro ${r.status}`}`);
    return j;
  }
  async function enviar(corpo: Record<string, unknown>): Promise<Envio> {
    try {
      const r = await chamar<{ messages?: { id: string }[] }>(`/${v.WHATSAPP_NUMERO_ID}/messages`, {
        method: "POST",
        body: JSON.stringify({ messaging_product: "whatsapp", ...corpo }),
      });
      return { ok: true, id: r.messages?.[0]?.id ?? "" };
    } catch (e) {
      return { ok: false, erro: mensagemDeErro(e, "Falha ao enviar pelo WhatsApp.") };
    }
  }
  return {
    tipo: "meta",
    enviarTexto: (para, texto) => enviar({ to: normalizarTelefone(para), type: "text", text: { body: texto } }),
    enviarModelo: (para, modelo, parametros = [], idioma = "pt_BR") =>
      enviar({
        to: normalizarTelefone(para),
        type: "template",
        template: {
          name: modelo,
          language: { code: idioma },
          ...(parametros.length ? { components: [{ type: "body", parameters: parametros.map((text) => ({ type: "text", text })) }] } : {}),
        },
      }),
    async testar() {
      try {
        const n = await chamar<{ display_phone_number?: string; verified_name?: string }>(
          `/${v.WHATSAPP_NUMERO_ID}?fields=display_phone_number,verified_name`,
        );
        return { ok: true, detalhe: `Conectado ao número ${n.display_phone_number ?? "?"} (${n.verified_name ?? "sem nome verificado"}).` };
      } catch (e) {
        return { ok: false, detalhe: mensagemDeErro(e, "Não foi possível falar com a Meta.") };
      }
    },
  };
}

export function provedorWhatsApp(): ProvedorWhatsApp {
  const { valores } = lerVariaveis(VARIAVEIS_WHATSAPP);
  return valores ? meta(valores) : demo;
}
