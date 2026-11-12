// Confere o login antes de qualquer consulta ou gravação. Use em toda página, rota e server action.
import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth, authConfigurado } from "@/auth";
import { SOCIOS, type Socio } from "./demo/dados";
import { listarSocios } from "./repositorio";

export type SessaoSocio = Socio & { demo: boolean };

export async function exigirSocio(): Promise<SessaoSocio> {
  // Garante renderização a cada requisição: o login nunca pode ficar congelado no build.
  await connection();
  if (!authConfigurado) {
    // Sem login configurado, só a demonstração local é liberada. Em produção, bloqueia.
    if (process.env.NODE_ENV === "production" && process.env.PERMITIR_DEMO !== "1") {
      redirect("/login?erro=configuracao");
    }
    // Com banco e sem AUTH_SECRET (só no computador local), age como o primeiro sócio cadastrado.
    const primeiro = (await listarSocios())[0] ?? SOCIOS[0]!;
    return { ...primeiro, demo: true };
  }
  const sessao = await auth();
  const id = sessao?.user?.id;
  if (!id) redirect("/login");
  // Confere a cada requisição se o sócio ainda existe na tabela (remoção corta o acesso na hora).
  const socio = (await listarSocios()).find((s) => s.id === id);
  if (!socio) redirect("/login?erro=removido");
  return { ...socio, demo: false };
}
