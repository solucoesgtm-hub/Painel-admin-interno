// Logomarca da GTM (pinguim) desenhada em vetor a partir da arte enviada.
// As coordenadas usam o quadro de 1280 px da arte original; o recorte útil é o círculo
// de centro (640, 640) e raio 366, por isso o viewBox padrão é "274 274 732 732".

export const MARCA_ESCURO = "#141414";
export const MARCA_CLARO = "#f1f0eb";

export const VIEWBOX_CIRCULO = "274 274 732 732";
/** Só o pinguim, sem o círculo (variante "solta"). */
export const VIEWBOX_PINGUIM = "330 340 620 620";

/** Silhueta escura: cabeça arredondada e laterais que descem até a borda do círculo. */
export const SILHUETA =
  "M352 846 C368 748 392 684 418 628 C438 588 447 572 447 552 C447 440 535 362 640 362 C745 362 833 440 833 552 C833 572 842 588 862 628 C888 684 912 748 928 846 L928 1010 L352 1010 Z";

/** Barriga clara, com o bico escuro em "V" no alto. */
export const BARRIGA =
  "M462 1010 L468 952 C494 846 540 778 606 738 C616 780 628 814 640 838 C652 814 664 780 674 738 C740 778 786 846 812 952 L818 1010 Z";

/** Faixas claras do rosto (esquerda e direita espelhadas), finas nas pontas. */
export const FAIXA_ESQ =
  "M485 503 C566 508 612 566 613 636 C614 700 624 770 640 838 C628 776 604 704 601 642 C598 574 560 520 485 503 Z";
export const FAIXA_DIR =
  "M795 503 C714 508 668 566 667 636 C666 700 656 770 640 838 C652 776 676 704 679 642 C682 574 720 520 795 503 Z";

/** Raio do recorte da silhueta: deixa um filete claro entre o pinguim e a borda do círculo. */
export const RAIO_RECORTE = 356;

/**
 * SVG completo em texto (para favicon e para gerar os PNG dos ícones).
 * - "circulo": círculo claro com o pinguim escuro, sobre fundo escuro arredondado (ícone de app).
 * - "claro": pinguim escuro sobre fundo claro arredondado, sem círculo.
 */
export function svgMarca(variante: "circulo" | "claro", opcoes: { cantos?: number; margem?: number } = {}) {
  const { cantos = 0.22, margem = 0.12 } = opcoes;
  if (variante === "circulo") {
    // Quadro 1280: o círculo ocupa 732 px; a margem define o respiro até a borda do ícone.
    const lado = 732 / (1 - 2 * margem);
    const x0 = 640 - lado / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${x0} ${lado} ${lado}">
  <rect x="${x0}" y="${x0}" width="${lado}" height="${lado}" rx="${lado * cantos}" fill="${MARCA_ESCURO}"/>
  <circle cx="640" cy="640" r="366" fill="${MARCA_CLARO}"/>
  <clipPath id="r"><circle cx="640" cy="640" r="${RAIO_RECORTE}"/></clipPath>
  <g clip-path="url(#r)">
    <path d="${SILHUETA}" fill="${MARCA_ESCURO}"/>
    <path d="${BARRIGA}" fill="${MARCA_CLARO}"/>
    <path d="${FAIXA_ESQ}" fill="${MARCA_CLARO}"/>
    <path d="${FAIXA_DIR}" fill="${MARCA_CLARO}"/>
  </g>
</svg>`;
  }
  const lado = 620 / (1 - 2 * margem);
  const cx = 640;
  const cy = 650;
  const x0 = cx - lado / 2;
  const y0 = cy - lado / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${lado} ${lado}">
  <rect x="${x0}" y="${y0}" width="${lado}" height="${lado}" rx="${lado * cantos}" fill="${MARCA_CLARO}"/>
  <clipPath id="r"><circle cx="640" cy="640" r="${RAIO_RECORTE}"/></clipPath>
  <g clip-path="url(#r)">
    <path d="${SILHUETA}" fill="${MARCA_ESCURO}"/>
    <path d="${BARRIGA}" fill="${MARCA_CLARO}"/>
    <path d="${FAIXA_ESQ}" fill="${MARCA_CLARO}"/>
    <path d="${FAIXA_DIR}" fill="${MARCA_CLARO}"/>
  </g>
</svg>`;
}
