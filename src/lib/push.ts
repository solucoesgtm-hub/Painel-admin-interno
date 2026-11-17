// Envio de notificações (Web Push) para os aparelhos dos sócios. Só roda no servidor.
// Chaves VAPID (geradas uma vez com `npx web-push generate-vapid-keys`):
//   VAPID_PUBLIC_KEY   → vai para o navegador (não é segredo)
//   VAPID_PRIVATE_KEY  → segredo, só no servidor
//   VAPID_CONTATO      → contato exigido pelos serviços de push (mailto: ou https://)
import "server-only";
import webpush from "web-push";

export type Inscricao = { endpoint: string; p256dh: string; auth: string };
export type Aviso = { titulo: string; texto: string; url: string; naoLidas?: number };

let configurado: boolean | null = null;

export function pushConfigurado(): boolean {
  if (configurado !== null) return configurado;
  const pub = process.env.VAPID_PUBLIC_KEY?.trim();
  const priv = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!pub || !priv) return (configurado = false);
  webpush.setVapidDetails(process.env.VAPID_CONTATO?.trim() || "https://painel-admin-interno.vercel.app", pub, priv);
  return (configurado = true);
}

export const chavePublicaPush = () => process.env.VAPID_PUBLIC_KEY?.trim() || null;

/**
 * Envia o aviso para cada inscrição. Devolve os endpoints que não existem mais (aparelho
 * desinstalou ou revogou a permissão) para o chamador apagar do banco.
 */
export async function enviarAvisos(inscricoes: Inscricao[], aviso: Aviso): Promise<string[]> {
  if (!pushConfigurado() || inscricoes.length === 0) return [];
  const corpo = JSON.stringify(aviso);
  const expirados: string[] = [];
  await Promise.all(
    inscricoes.map(async (i) => {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, corpo, {
          TTL: 60 * 60 * 24,
          urgency: "high",
        });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expirados.push(i.endpoint);
        else console.warn("[push] falha ao enviar:", status ?? (e instanceof Error ? e.message : e));
      }
    }),
  );
  return expirados;
}
