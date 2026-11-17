// Situação da IA para as telas: ligada (com gasto do mês e teto) ou exemplo (sem ANTHROPIC_API_KEY).
// Sem a chave, o sistema funciona por inteiro com um exemplo montado a partir do diagnóstico, sem custo.
// Ao cadastrar a chave na Vercel, o mesmo botão passa a gerar com a IA, sem outra mudança.
import "server-only";
import type { EstadoIA } from "../regras/ia";
import { gastoIaDoMes } from "../repositorio";
import { iaConfigurada, tetoMensalBRL } from "./claude";

export async function estadoIa(): Promise<EstadoIA> {
  if (iaConfigurada()) {
    const gastoMes = await gastoIaDoMes().catch(() => 0);
    return { tipo: "ligada", gastoMes, teto: tetoMensalBRL() };
  }
  return { tipo: "exemplo" };
}
