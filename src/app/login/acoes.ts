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
    if (e instanceof AuthError) {
      if (e.type === "CredentialsSignin") return { erro: "E-mail ou senha incorretos.", email };
      console.error("[login] falha de configuração/servidor:", e.type, e.message);
      return { erro: `Não foi possível entrar por um erro no servidor (código: ${e.type}). Tente de novo em instantes.`, email };
    }
    throw e;
  }
}
