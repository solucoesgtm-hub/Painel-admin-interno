// Teto do MEI: limite anual, proporcional no ano de abertura, alerta em 80%.
export const LIMITE_MEI_PADRAO = 81_000;
export const ALERTA_MEI = 0.8;

/** No ano de abertura, conta os meses a partir do mês de abertura (inclusive). */
export function limiteMei(ano: number, abertura: Date, limiteAnual = LIMITE_MEI_PADRAO) {
  if (abertura.getFullYear() > ano) return 0;
  if (abertura.getFullYear() < ano) return limiteAnual;
  const meses = 12 - abertura.getMonth();
  return (limiteAnual / 12) * meses;
}

export type NivelMei = "ok" | "alerta" | "estourado";

export function situacaoMei(faturado: number, limite: number) {
  const uso = limite > 0 ? faturado / limite : 0;
  const nivel: NivelMei = uso >= 1 ? "estourado" : uso >= ALERTA_MEI ? "alerta" : "ok";
  return { uso, restante: Math.max(0, limite - faturado), nivel };
}
