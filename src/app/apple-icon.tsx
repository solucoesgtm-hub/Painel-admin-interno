// Ícone do iPhone/iPad ao "Adicionar à Tela de Início". O iOS arredonda os cantos sozinho,
// por isso o quadrado vai sem cantos e com um pouco mais de respiro.
import { iconePng } from "@/lib/icone-png";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return iconePng(180, { cantos: 0, margem: 0.13 });
}
