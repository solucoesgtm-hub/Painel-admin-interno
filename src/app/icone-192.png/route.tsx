// Ícone 192×192 do app instalado (Android, Chrome e Edge no computador), com cantos arredondados.
import { iconePng } from "@/lib/icone-png";

export const dynamic = "force-static";

export function GET() {
  return iconePng(192, { cantos: 0.22, margem: 0.08 });
}
