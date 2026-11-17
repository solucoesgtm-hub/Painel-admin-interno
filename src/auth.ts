// Login por e-mail e senha (Auth.js). Cada sócio tem a própria senha, guardada como hash
// na tabela `socios`. Só entra quem está nessa tabela (e em SOCIOS_EMAILS, se definida).
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { LOGIN_JANELA_MINUTOS, loginBloqueado } from "@/lib/regras/chat";

export const emailsAutorizados = (process.env.SOCIOS_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** O login precisa do segredo de sessão e do banco (onde ficam as senhas). */
export const authConfigurado = Boolean(process.env.AUTH_SECRET && process.env.DATABASE_URL);

const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(1).max(200),
});

class LoginInvalido extends CredentialsSignin {
  code = "credenciais";
}
class LoginBloqueado extends CredentialsSignin {
  code = "bloqueado";
}
/** Por IP o limite é maior: os três sócios podem estar na mesma rede. */
const LIMITE_POR_IP = 20;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  providers: [
    Credentials({
      credentials: { email: { label: "E-mail", type: "email" }, senha: { label: "Senha", type: "password" } },
      async authorize(entrada, requisicao) {
        const inicio = Date.now();
        const ip = requisicao?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
        const chaveIp = ip ? `ip:${ip}` : null;
        const falhar = async (motivo: string, email?: string) => {
          // O motivo real fica só no log do servidor (Vercel → Logs); a tela mostra mensagem genérica.
          const mascarado = email ? `${email.slice(0, 3)}***@${email.split("@")[1] ?? ""}` : "-";
          console.warn(`[login] recusado: ${motivo} (${mascarado})`);
          // Tempo mínimo constante: dificulta tentativa em massa e não revela se o e-mail existe.
          await esperar(Math.max(0, 800 - (Date.now() - inicio)));
          throw new LoginInvalido();
        };

        const r = esquemaLogin.safeParse(entrada);
        if (!r.success) return falhar("formato_invalido");
        const { email, senha } = r.data;
        if (emailsAutorizados.length && !emailsAutorizados.includes(email)) return falhar("fora_de_SOCIOS_EMAILS", email);

        const [{ db }, { socios }, { eq }, { conferirSenha }] = await Promise.all([
          import("@/db"),
          import("@/db/schema"),
          import("drizzle-orm"),
          import("@/lib/senha"),
        ]);
        const tentativas = await import("@/db/consultas/chat");
        const janela = new Date(Date.now() - LOGIN_JANELA_MINUTOS * 60_000);
        let socio;
        try {
          // Bloqueio temporário: muitas recusas seguidas para o mesmo e-mail ou vindas do mesmo IP.
          const [porEmail, porIp] = await Promise.all([
            tentativas.contarTentativas(email, janela),
            chaveIp ? tentativas.contarTentativas(chaveIp, janela) : 0,
          ]);
          if (loginBloqueado(porEmail) || porIp >= LIMITE_POR_IP) {
            console.warn(`[login] bloqueado por excesso de tentativas (${email.slice(0, 3)}***)`);
            await esperar(Math.max(0, 800 - (Date.now() - inicio)));
            throw new LoginBloqueado();
          }
          socio = await db.query.socios.findFirst({ where: eq(socios.email, email) });
        } catch (e) {
          if (e instanceof LoginBloqueado) throw e;
          console.error("[login] erro ao consultar o banco:", e instanceof Error ? e.message : e);
          throw new Error("banco_indisponivel");
        }
        const recusar = async (motivo: string) => {
          await Promise.all([tentativas.registrarTentativa(email), chaveIp ? tentativas.registrarTentativa(chaveIp) : null]).catch(() => {});
          return falhar(motivo, email);
        };
        if (!socio) return recusar("email_nao_cadastrado");
        if (!socio.senhaHash) return recusar("sem_senha_definida");
        if (!(await conferirSenha(senha, socio.senhaHash))) return recusar("senha_incorreta");

        await tentativas.limparTentativas(email, new Date(Date.now() - 24 * 60 * 60_000)).catch(() => {});
        return { id: socio.id, email: socio.email, name: socio.nome };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.socioId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.socioId === "string") session.user.id = token.socioId;
      return session;
    },
  },
});
