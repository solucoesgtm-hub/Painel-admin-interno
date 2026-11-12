// Confere o login antes de qualquer consulta ou gravação. Use em toda página, rota e server action.
import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth, authConfigurado } from "@/auth";
import { SOCIOS, type Socio } from "./demo/dados";

export type SessaoSocio = Socio & { demo: boolean };

export async function exigirSocio(): Promise<SessaoSocio> {
  // Garante renderização a cada requisição: o login nunca pode ficar congelado no build.
  await connection();
  if (!authConfigurado) {
    // Sem login configurado, só a demonstração local é liberada. Em produção, bloqueia.
    if (process.env.NODE_ENV === "production" && process.env.PERMITIR_DEMO !== "1") {
      redirect("/login?erro=configuracao");
    }
    return { ...SOCIOS[0]!, demo: true };
  }
  const sessao = await auth();
  const email = sessao?.user?.email?.toLowerCase();
  if (!email) redirect("/login");
  const socio = SOCIOS.find((s) => s.email === email);
  return {
    ...(socio ?? { id: email, nome: sessao?.user?.name ?? email, email, area: "Sócio", cor: "#3f6fd8", foco: "" }),
    demo: false,
  };
}
