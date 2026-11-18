// Conexão com o Neon. Use somente no servidor (rotas, server actions, scripts).
// A DATABASE_URL nunca pode chegar ao navegador.
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL não definida. Copie .env.example para .env.local e cole a conexão do Neon.",
  );
}

// Tempo-limite por consulta: se o Neon demorar (acordando ou sobrecarregado), a tela mostra o
// erro em vez de ficar travada e segurando a função da Vercel. 20 s cobre o "acordar" do Neon.
const LIMITE_CONSULTA_MS = 20_000;
neonConfig.fetchFunction = (entrada: RequestInfo | URL, opcoes?: RequestInit) =>
  fetch(entrada, {
    ...opcoes,
    signal: opcoes?.signal ? AbortSignal.any([opcoes.signal, AbortSignal.timeout(LIMITE_CONSULTA_MS)]) : AbortSignal.timeout(LIMITE_CONSULTA_MS),
  });

const sql = neon(url);

export const db = drizzle({ client: sql, schema });
export { schema };
