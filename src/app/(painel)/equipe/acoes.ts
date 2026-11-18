"use server";
// Foto do perfil: cada sócio troca ou remove só a própria.
import { revalidatePath } from "next/cache";
import { fotoValida } from "@/lib/regras/avatar";
import { salvarFotoSocio } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export async function acaoSalvarFoto(foto: unknown): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const socio = await exigirSocio();
  if (foto !== null && !fotoValida(foto)) return { ok: false, mensagem: "Imagem inválida ou grande demais. Use JPG, PNG ou WebP." };
  try {
    await salvarFotoSocio(socio, foto);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível salvar a foto." };
  }
}
