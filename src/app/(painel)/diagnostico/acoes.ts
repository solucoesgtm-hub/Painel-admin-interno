"use server";
// Salva o diagnóstico da visita. Confere o login, valida com Zod e recalcula a pontuação no servidor.
import { revalidatePath } from "next/cache";
import { esquemaDiagnostico, type Veredito } from "@/lib/regras/pontuacao";
import { salvarDiagnostico } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export type ResultadoDiagnostico =
  | { ok: true; pontuacao: number; veredito: Veredito }
  | { ok: false; mensagem: string };

export async function acaoSalvarDiagnostico(dados: unknown): Promise<ResultadoDiagnostico> {
  const socio = await exigirSocio();
  const r = esquemaDiagnostico.safeParse(dados);
  if (!r.success) {
    const primeiro = r.error.issues[0];
    return { ok: false, mensagem: primeiro?.path[0] === "leadId" ? "Escolha o lead visitado antes de salvar." : "Confira as respostas do checklist." };
  }
  if (Object.values(r.data.notas).some((n) => n === 0)) {
    return { ok: false, mensagem: "Dê uma nota de 1 a 5 para os cinco fatores do Fechamento." };
  }
  try {
    const res = await salvarDiagnostico(r.data, socio);
    revalidatePath("/leads");
    revalidatePath(`/leads/${r.data.leadId}`);
    revalidatePath("/analise");
    revalidatePath("/");
    return { ok: true, pontuacao: res.pontuacao, veredito: res.veredito };
  } catch {
    return { ok: false, mensagem: "Não foi possível salvar. O rascunho continua no aparelho; tente de novo." };
  }
}
