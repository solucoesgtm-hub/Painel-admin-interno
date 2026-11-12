// Formatação no padrão do Hub: pt-BR, reais, dia/mês/ano, fuso America/Sao_Paulo.
export const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moedaCurta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const numero = new Intl.NumberFormat("pt-BR");
const porcento = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });

export const brl = (v: number) => moeda.format(v);
export const brlCurto = (v: number) => moedaCurta.format(v);
export const num = (v: number) => numero.format(v);
export const pct = (v: number) => porcento.format(v);

/** Converte "AAAA-MM-DD" ou Date em Date ao meio-dia de Brasília, evitando virar o dia por fuso. */
export function paraData(d: string | Date): Date {
  if (d instanceof Date) return d;
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(`${d}T12:00:00-03:00`) : new Date(d);
}

export const data = (d: string | Date) => paraData(d).toLocaleDateString("pt-BR", { timeZone: FUSO });

export const dataCurta = (d: string | Date) =>
  paraData(d)
    .toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "short" })
    .replace(".", "");

export const dataHora = (d: string | Date) =>
  paraData(d).toLocaleString("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });

export const hora = (d: string | Date) =>
  paraData(d).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

export const diaSemana = (d: string | Date) =>
  paraData(d).toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long" });

/** Hoje no fuso de São Paulo, como "AAAA-MM-DD". */
export function hojeISO(agora = new Date()): string {
  return agora.toLocaleDateString("en-CA", { timeZone: FUSO });
}

export function somarDias(iso: string, dias: number): string {
  const d = paraData(iso);
  d.setUTCDate(d.getUTCDate() + dias);
  return hojeISO(d);
}

export function diasEntre(a: string | Date, b: string | Date): number {
  return Math.round((paraData(b).getTime() - paraData(a).getTime()) / 86_400_000);
}

export function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function relativo(iso: string, hoje = hojeISO()): string {
  const d = diasEntre(hoje, iso);
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  if (d === -1) return "ontem";
  if (d > 1) return `em ${d} dias`;
  return `há ${-d} dias`;
}
