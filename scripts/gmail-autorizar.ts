// Gera o GMAIL_REFRESH_TOKEN uma única vez, no seu computador.
// Antes: GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no .env.local (passo a passo em docs/CONEXOES.md).
// Uso: npm run gmail:autorizar  → abra o link, entre com a conta da GTM e autorize.
// O token aparece no terminal: copie para o .env.local e para a Vercel. Não compartilhe.
import { createServer } from "node:http";

const PORTA = 53682;
const REDIRECIONAMENTO = `http://127.0.0.1:${PORTA}`;
const ESCOPO = "https://www.googleapis.com/auth/gmail.modify";

const clientId = process.env.GMAIL_CLIENT_ID?.trim();
const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
if (!clientId || !clientSecret) {
  console.error("Defina GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no .env.local antes de rodar.");
  process.exit(1);
}

const link =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECIONAMENTO,
    response_type: "code",
    scope: ESCOPO,
    access_type: "offline",
    prompt: "consent",
  }).toString();

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECIONAMENTO);
  const codigo = url.searchParams.get("code");
  const erro = url.searchParams.get("error");
  if (!codigo) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end(erro ? `Autorização recusada: ${erro}` : "Sem código.");
    return;
  }
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code: codigo, client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECIONAMENTO, grant_type: "authorization_code" }),
    });
    const j = (await r.json()) as { refresh_token?: string; error_description?: string };
    if (!j.refresh_token) throw new Error(j.error_description ?? "O Google não devolveu o refresh token.");
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end("Pronto! Pode fechar esta aba e voltar ao terminal.");
    console.log("\nGMAIL_REFRESH_TOKEN encontrado. Copie a linha abaixo para o .env.local e para a Vercel:\n");
    console.log(`GMAIL_REFRESH_TOKEN=${j.refresh_token}\n`);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" }).end("Falhou. Veja o terminal.");
    console.error("Falha ao trocar o código:", e instanceof Error ? e.message : e);
  } finally {
    servidor.close();
  }
});

servidor.listen(PORTA, "127.0.0.1", () => {
  console.log("Abra este link no navegador e autorize com a conta de e-mail da GTM:\n");
  console.log(link + "\n");
});
