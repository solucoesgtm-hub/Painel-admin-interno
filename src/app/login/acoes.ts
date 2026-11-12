"use server";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type EstadoLogin = { erro: string | null; email: string };

export async function entrar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha.", email };
  try {
    await signIn("credentials", { email, senha, redirectTo: "/" });
    return { erro: null, email };
  } catch (e) {
    // Sucesso também "lança" (redirecionamento do Next); só tratamos falha de login.
    if (e instanceof AuthError) return { erro: "E-mail ou senha incorretos.", email };
    throw e;
  }
}
