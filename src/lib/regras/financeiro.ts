// Regras do financeiro: situação das mensalidades, conciliação e divisão entre sócios.
import { hojeISO } from "../formato";

export type SituacaoMensalidade = "a_vencer" | "pago" | "atrasado";

export function situacaoMensalidade(vencimento: string, pagoEm: string | null, hoje = hojeISO()): SituacaoMensalidade {
  if (pagoEm) return "pago";
  return vencimento < hoje ? "atrasado" : "a_vencer";
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Conciliação automática: valor igual (até 1 centavo) e pagador com o mesmo documento ou nome. */
export function conciliaAutomatico(
  entrada: { valor: number; pagadorDoc?: string; pagadorNome: string },
  cobranca: { valor: number; clienteDoc?: string; clienteNome: string },
) {
  const valorBate = Math.abs(entrada.valor - cobranca.valor) < 0.01;
  const pagadorBate =
    (!!entrada.pagadorDoc && entrada.pagadorDoc === cobranca.clienteDoc) ||
    normalizar(entrada.pagadorNome) === normalizar(cobranca.clienteNome);
  return valorBate && pagadorBate;
}

/** Divide o resultado em partes iguais; os centavos que sobram vão para os primeiros. */
export function dividirEntreSocios(resultado: number, socios: number) {
  const centavos = Math.round(resultado * 100);
  const base = Math.trunc(centavos / socios);
  const sobra = centavos - base * socios;
  return Array.from({ length: socios }, (_, i) => (base + (i < sobra ? 1 : 0)) / 100);
}
