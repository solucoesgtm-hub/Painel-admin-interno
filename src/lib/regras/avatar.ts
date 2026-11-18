// Regras do avatar dos sócios: endereço da foto (com versão, para o cache) e validação do envio.

/** Tamanho máximo da data URL aceita (a foto já chega reduzida a 256 px pelo navegador). */
export const MAX_FOTO = 300_000;

/** Endereço da foto de um sócio, ou null quando ele usa as iniciais. A versão muda a cada troca. */
export function fotoDoSocio(s: { id: string; fotoEm?: string | null } | null | undefined): string | null {
  if (!s?.fotoEm) return null;
  return `/api/avatar/${encodeURIComponent(s.id)}?v=${Date.parse(s.fotoEm) || 0}`;
}

/** Aceita só imagem webp, jpeg ou png em data URL base64, dentro do limite. */
export function fotoValida(dataUrl: unknown): dataUrl is string {
  return (
    typeof dataUrl === "string" &&
    dataUrl.length <= MAX_FOTO &&
    /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)
  );
}
