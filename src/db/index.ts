// Conexão com o Neon. Use somente no servidor (rotas, server actions, scripts).
// A DATABASE_URL nunca pode chegar ao navegador.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL não definida. Copie .env.example para .env.local e cole a conexão do Neon.",
  );
}

const sql = neon(url);

export const db = drizzle({ client: sql, schema });
export { schema };
