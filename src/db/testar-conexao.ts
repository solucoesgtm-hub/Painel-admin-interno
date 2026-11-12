// Confere se a conexão com o Neon funciona e quantos registros há em cada tabela.
import { count, sql } from "drizzle-orm";
import { db } from "./index";
import { diagnosticos, historico, leads, socios } from "./schema";

const agora = await db.execute(sql`select now() as agora`);
console.log("Conectado ao Neon. Hora do banco:", agora.rows[0]?.agora);

const tabelas = { socios, leads, diagnosticos, historico };
for (const [nome, tabela] of Object.entries(tabelas)) {
  const [linha] = await db.select({ total: count() }).from(tabela);
  console.log(`${nome}: ${linha.total} registro(s)`);
}
