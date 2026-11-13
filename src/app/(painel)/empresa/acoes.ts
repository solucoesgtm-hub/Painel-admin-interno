"use server";
// Ações de "Nossa empresa": dados cadastrais e contratos. Toda ação confere o login e valida com Zod.
import { revalidatePath } from "next/cache";
import { esquemaContrato, esquemaEmpresa } from "@/lib/regras/empresa";
import { salvarContrato, salvarEmpresa } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export type Resultado = { ok: true; id?: string } | { ok: false; erros: Record<string, string>; mensagem: string };

const errosDe = (issues: { path: PropertyKey[]; message: string }[]) => {
  const erros: Record<string, string> = {};
  for (const i of issues) erros[String(i.path[0])] ??= i.message;
  return erros;
};

export async function acaoSalvarEmpresa(dados: unknown): Promise<Resultado> {
  const socio = await exigirSocio();
  const r = esquemaEmpresa.safeParse(dados);
  if (!r.success) return { ok: false, erros: errosDe(r.error.issues), mensagem: "Confira os campos destacados." };
  try {
    await salvarEmpresa(r.data, socio);
    revalidatePath("/empresa");
    return { ok: true };
  } catch {
    return { ok: false, erros: {}, mensagem: "Não foi possível salvar os dados da empresa. Tente de novo." };
  }
}

export async function acaoSalvarContrato(dados: unknown): Promise<Resultado> {
  const socio = await exigirSocio();
  const r = esquemaContrato.safeParse(dados);
  if (!r.success) return { ok: false, erros: errosDe(r.error.issues), mensagem: "Confira os campos destacados." };
  try {
    const id = await salvarContrato(r.data, socio);
    revalidatePath("/contratos");
    revalidatePath("/empresa");
    revalidatePath("/");
    return { ok: true, id };
  } catch {
    return { ok: false, erros: {}, mensagem: "Não foi possível salvar o contrato. Tente de novo." };
  }
}
