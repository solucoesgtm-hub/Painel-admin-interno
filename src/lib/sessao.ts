// Confere o login antes de qualquer consulta ou gravação. Use em toda página, rota e server action.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { after, connection } from "next/server";
import { auth, authConfigurado } from "@/auth";
import { SOCIOS, type Socio } from "./demo/dados";
import { deveGravarVisto } from "./regras/chat";
import { listarSocios, registrarVisto } from "./repositorio";

/** Atualiza o "visto por último" depois de responder (não atrasa a tela), no máximo 1x por minuto. */
function marcarVisto(socio: Socio) {
  if (!deveGravarVisto(socio.vistoEm)) return;
  after(() => registrarVisto(socio.id).catch(() => {}));
}

export type SessaoSocio = Socio & { demo: boolean };

/**
 * Layout e página chamam exigirSocio na mesma requisição: com `cache`, a sessão e a lista de
 * sócios são lidas uma vez só por tela (menos consultas ao Neon).
 */
export const exigirSocio = cache(conferirSocio);

async function conferirSocio(): Promise<SessaoSocio> {
  // Garante renderização a cada requisição: o login nunca pode ficar congelado no build.
  await connection();
  if (!authConfigurado) {
    // Sem login configurado, só a demonstração é liberada. Em produção, bloqueia — e mesmo com
    // PERMITIR_DEMO=1 só libera sem banco (dados fictícios): com DATABASE_URL e sem AUTH_SECRET,
    // qualquer visitante entraria como sócio nos dados reais.
    if (process.env.NODE_ENV === "production" && (process.env.PERMITIR_DEMO !== "1" || process.env.DATABASE_URL)) {
      redirect("/login?erro=configuracao");
    }
    // Com banco e sem AUTH_SECRET (só no computador local), age como o primeiro sócio cadastrado.
    const primeiro = (await listarSocios())[0] ?? SOCIOS[0]!;
    marcarVisto(primeiro);
    return { ...primeiro, demo: true };
  }
  const sessao = await auth();
  const id = sessao?.user?.id;
  if (!id) redirect("/login");
  // Confere a cada requisição se o sócio ainda existe na tabela (remoção corta o acesso na hora).
  const socio = (await listarSocios()).find((s) => s.id === id);
  if (!socio) redirect("/login?erro=removido");
  marcarVisto(socio);
  return { ...socio, demo: false };
}
