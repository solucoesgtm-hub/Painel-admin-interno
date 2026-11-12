"use server";
// Server actions do funil. Toda ação confere o login e valida a entrada com Zod.
import { revalidatePath } from "next/cache";
import { esquemaEditarLead, esquemaMoverEtapa, esquemaNovoLead } from "@/lib/regras/funil";
import { atualizarLead, criarLead, moverLead } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export type Resultado = { ok: true; id?: string } | { ok: false; erros: Record<string, string>; mensagem: string };

export async function acaoCriarLead(dados: unknown): Promise<Resultado> {
  const socio = await exigirSocio();
  const r = esquemaNovoLead.safeParse(dados);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { ok: false, erros, mensagem: "Confira os campos destacados." };
  }
  try {
    const id = await criarLead(r.data, socio);
    revalidatePath("/leads");
    revalidatePath("/");
    return { ok: true, id };
  } catch {
    return { ok: false, erros: {}, mensagem: "Não foi possível salvar o lead. Tente de novo." };
  }
}

export async function acaoMoverLead(dados: unknown): Promise<Resultado> {
  const socio = await exigirSocio();
  const r = esquemaMoverEtapa.safeParse(dados);
  if (!r.success) {
    return { ok: false, erros: { motivoPerda: r.error.issues[0]?.message ?? "" }, mensagem: r.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await moverLead(r.data.leadId, r.data.etapa, socio, r.data.motivoPerda);
    revalidatePath("/leads");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, erros: {}, mensagem: "Não foi possível mover o card. Tente de novo." };
  }
}

export async function acaoEditarLead(dados: unknown): Promise<Resultado> {
  const socio = await exigirSocio();
  const r = esquemaEditarLead.safeParse(dados);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { ok: false, erros, mensagem: "Confira os campos destacados." };
  }
  try {
    await atualizarLead(r.data, socio);
    revalidatePath("/leads");
    revalidatePath(`/leads/${r.data.leadId}`);
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, erros: {}, mensagem: "Não foi possível salvar as alterações. Tente de novo." };
  }
}
