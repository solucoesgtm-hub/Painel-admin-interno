// Webhook do WhatsApp (Meta). Rota pública por natureza: a Meta chama sem login.
// GET  → verificação no cadastro do webhook (hub.verify_token).
// POST → mensagens e status; só aceita com assinatura válida (META_APP_SECRET).
// Por enquanto registra apenas a contagem no log; guardar as mensagens no Neon é o próximo passo
// (ver docs/CONEXOES.md). Responde 200 rápido, como a Meta exige.
import { assinaturaValida } from "@/lib/conexoes/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const esperado = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (esperado && p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === esperado) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Verificação recusada.", { status: 403 });
}

type Corpo = { entry?: { changes?: { value?: { messages?: unknown[]; statuses?: unknown[] } }[] }[] };

export async function POST(req: Request) {
  const bruto = await req.text();
  if (!assinaturaValida(bruto, req.headers.get("x-hub-signature-256"))) {
    return new Response("Assinatura inválida.", { status: 401 });
  }
  try {
    const corpo = JSON.parse(bruto) as Corpo;
    const valores = (corpo.entry ?? []).flatMap((e) => (e.changes ?? []).map((c) => c.value ?? {}));
    const mensagens = valores.reduce((a, v) => a + (v.messages?.length ?? 0), 0);
    const status = valores.reduce((a, v) => a + (v.statuses?.length ?? 0), 0);
    console.info(`[whatsapp] webhook: ${mensagens} mensagem(ns), ${status} status`);
  } catch {
    console.warn("[whatsapp] webhook com corpo ilegível");
  }
  return new Response("ok", { status: 200 });
}
