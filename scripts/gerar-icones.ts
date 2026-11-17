// Gera os arquivos de ícone a partir da marca em vetor (src/lib/marca.ts).
// Rode depois de mudar a marca: npx tsx scripts/gerar-icones.ts
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { svgMarca } from "../src/lib/marca";

const app = join(process.cwd(), "src", "app");
// Favicon: círculo claro com o pinguim, em quadrado escuro arredondado (lê bem em abas claras e escuras).
writeFileSync(join(app, "icon.svg"), svgMarca("circulo", { margem: 0.08, cantos: 0.22 }));
console.log("src/app/icon.svg gerado");
