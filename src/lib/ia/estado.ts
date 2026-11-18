// Situação da IA para as telas e trava de uso. A API do Claude só atende duas finalidades
// (relatório do diagnóstico e escopo do contrato) e só enquanto couber no teto do mês e nos créditos.
// Sem a chave, o sistema funciona por inteiro com um exemplo montado a partir do diagnóstico, sem custo.
import "server-only";
import { bloqueioIa, limiteCreditosBRL, type EstadoIA, type FinalidadeIa } from "../regras/ia";
import { gastoIaDoMes, gastoIaTotal } from "../repositorio";
import { cotacaoDolar, creditosUSD, iaConfigurada, tetoMensalBRL } from "./claude";

async function gastos() {
  const [gastoMes, gastoTotal] = await Promise.all([gastoIaDoMes(), gastoIaTotal()]);
  return { gastoMes, gastoTotal, tetoMes: tetoMensalBRL(), limiteTotal: limiteCreditosBRL(creditosUSD(), cotacaoDolar()) };
}

export async function estadoIa(): Promise<EstadoIA> {
  if (!iaConfigurada()) return { tipo: "exemplo" };
  const g = await gastos().catch(() => null);
  if (!g) return { tipo: "ligada", gastoMes: 0, teto: tetoMensalBRL() };
  // O teto mostrado é o menor entre o do mês e o que ainda resta dos créditos.
  return { tipo: "ligada", gastoMes: g.gastoMes, teto: Math.min(g.tetoMes, g.gastoMes + Math.max(0, g.limiteTotal - g.gastoTotal)) };
}

/**
 * Confere se a IA pode ser usada agora para esta finalidade. Devolve o motivo do bloqueio ou null.
 * Na dúvida (banco fora do ar), bloqueia: melhor usar o modelo sem custo do que gastar às cegas.
 */
export async function liberarIa(finalidade: FinalidadeIa): Promise<string | null> {
  if (!iaConfigurada()) return "A IA ainda não está ligada.";
  const g = await gastos().catch(() => null);
  if (!g) return "Não foi possível conferir o gasto da IA agora.";
  return bloqueioIa({ finalidade, ...g });
}
