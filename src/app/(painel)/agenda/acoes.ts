"use server";
// Ações da agenda: criar e excluir eventos (no Google Agenda quando ligado).
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { esquemaEvento } from "@/lib/regras/agenda";
import { criarEvento, excluirEvento } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export type Resultado = { ok: true } | { ok: false; erros: Record<string, string>; mensagem: string };

export async function acaoCriarEvento(dados: unknown): Promise<Resultado> {
  const socio = await exigirSocio();
  const r = esquemaEvento.safeParse(dados);
  if (!r.success) {
    const erros: Record<string, string> = {};
    for (const i of r.error.issues) erros[String(i.path[0])] ??= i.message;
    return { ok: false, erros, mensagem: "Confira os campos destacados." };
  }
  try {
    await criarEvento(r.data, socio);
    revalidatePath("/agenda");
    revalidatePath("/empresa");
    return { ok: true };
  } catch (e) {
    return { ok: false, erros: {}, mensagem: e instanceof Error ? e.message : "Não foi possível criar o evento." };
  }
}

const esquemaExcluir = z.object({ id: z.string().min(1).max(1024), titulo: z.string().max(200) });

export async function acaoExcluirEvento(dados: unknown): Promise<Resultado> {
  const socio = await exigirSocio();
  const r = esquemaExcluir.safeParse(dados);
  if (!r.success) return { ok: false, erros: {}, mensagem: "Evento inválido." };
  try {
    await excluirEvento(r.data.id, r.data.titulo, socio);
    revalidatePath("/agenda");
    revalidatePath("/empresa");
    return { ok: true };
  } catch (e) {
    return { ok: false, erros: {}, mensagem: e instanceof Error ? e.message : "Não foi possível excluir o evento." };
  }
}
