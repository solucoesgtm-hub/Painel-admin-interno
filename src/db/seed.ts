// Cadastra os sócios a partir da variável SOCIOS, no formato:
//   SOCIOS="Nome|email|Área;Nome|email|Área"
// Pode rodar mais de uma vez: quem já existe é atualizado, não duplicado.
import { db } from "./index";
import { socios } from "./schema";

const bruto = process.env.SOCIOS;
if (!bruto) {
  console.error('Defina SOCIOS no .env.local. Ex.: SOCIOS="Ana|ana@exemplo.com|Vendas"');
  process.exit(1);
}

const lista = bruto
  .split(";")
  .map((item) => item.split("|").map((parte) => parte.trim()))
  .filter((partes) => partes.length >= 2 && partes[0] && partes[1]);

for (const [nome, email, area] of lista) {
  await db
    .insert(socios)
    .values({ nome, email: email.toLowerCase(), area: area || null })
    .onConflictDoUpdate({ target: socios.email, set: { nome, area: area || null } });
  console.log(`Sócio salvo: ${nome}`);
}

console.log(`Pronto: ${lista.length} sócio(s).`);
