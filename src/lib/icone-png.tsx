// Gera PNG da marca no tamanho pedido (ícones do atalho na tela inicial e na área de trabalho).
import { ImageResponse } from "next/og";
import { svgMarca } from "./marca";

type Opcoes = { margem?: number; cantos?: number };

export function iconePng(lado: number, opcoes: Opcoes = {}) {
  const svg = svgMarca("circulo", opcoes);
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} width={lado} height={lado} alt="" />
    ),
    {
      width: lado,
      height: lado,
      headers: { "Cache-Control": "public, max-age=86400, immutable" },
    },
  );
}
