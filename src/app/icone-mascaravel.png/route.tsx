// Ícone "maskable" do Android: o sistema recorta no formato do aparelho (círculo, gota, quadrado),
// então vai sem cantos e com a marca dentro da zona segura (80% do centro).
import { iconePng } from "@/lib/icone-png";

export const dynamic = "force-static";

export function GET() {
  return iconePng(512, { cantos: 0, margem: 0.2 });
}
