// Situação da IA para as telas: ligada (com gasto do mês e teto), exemplo (demonstração) ou desligada.
import "server-only";
import type { EstadoIA } from "../regras/ia";
import { gastoIaDoMes, modoDemo } from "../repositorio";
import { iaConfigurada, tetoMensalBRL } from "./claude";

export async function estadoIa(): Promise<EstadoIA> {
  if (iaConfigurada()) {
    const gastoMes = await gastoIaDoMes().catch(() => 0);
    return { tipo: "ligada", gastoMes, teto: tetoMensalBRL() };
  }
  return modoDemo ? { tipo: "exemplo" } : { tipo: "desligada" };
}
