// Define (ou troca) a senha de um sócio.
//   npm run db:senha -- email@exemplo.com
// Pergunta a senha no terminal. Deixe em branco para gerar uma senha temporária forte,
// que aparece uma única vez na tela. A senha nunca é gravada em texto, só o hash.
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { historico, socios } from "./schema";
import { gerarHash, gerarSenhaTemporaria, validarForcaSenha } from "../lib/senha";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Informe o e-mail do sócio. Ex.: npm run db:senha -- ana@exemplo.com");
  process.exit(1);
}

const socio = await db.query.socios.findFirst({ where: eq(socios.email, email) });
if (!socio) {
  console.error(`Nenhum sócio com o e-mail ${email}. Rode antes: npm run db:socios`);
  process.exit(1);
}

const rl = createInterface({ input: stdin, output: stdout });
const digitada = (await rl.question(`Nova senha de ${socio.nome} (Enter para gerar uma): `)).trim();
rl.close();

const senha = digitada || gerarSenhaTemporaria();
const problema = validarForcaSenha(senha);
if (problema) {
  console.error(problema);
  process.exit(1);
}

await db.batch([
  db.update(socios).set({ senhaHash: await gerarHash(senha), senhaDefinidaEm: sql`now()` }).where(eq(socios.id, socio.id)),
  db.insert(historico).values({
    atorTipo: "sistema",
    acao: "editou",
    entidade: "senha",
    entidadeId: socio.id,
    detalhes: { nome: `Senha de ${socio.nome}` },
  }),
]);

console.log(`\nSenha de ${socio.nome} salva.`);
if (!digitada) console.log(`Senha gerada (anote e entregue só a ${socio.nome}): ${senha}`);
