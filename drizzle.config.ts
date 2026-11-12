import { defineConfig } from "drizzle-kit";

// Carrega o .env.local quando ele existe (em produção as variáveis vêm do provedor).
try {
  process.loadEnvFile(".env.local");
} catch {}

// As migrações usam a conexão direta (sem "-pooler" no endereço).
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: url ?? "" },
});
