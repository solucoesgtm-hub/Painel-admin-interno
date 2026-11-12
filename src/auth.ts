// Login por e-mail e senha (Auth.js). Cada sócio tem a própria senha, guardada como hash
// na tabela `socios`. Só entra quem está nessa tabela (e em SOCIOS_EMAILS, se definida).
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

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

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  providers: [
    Credentials({
      credentials: { email: { label: "E-mail", type: "email" }, senha: { label: "Senha", type: "password" } },
      async authorize(entrada) {
        const inicio = Date.now();
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
        let socio;
        try {
          socio = await db.query.socios.findFirst({ where: eq(socios.email, email) });
        } catch (e) {
          console.error("[login] erro ao consultar o banco:", e instanceof Error ? e.message : e);
          throw new Error("banco_indisponivel");
        }
        if (!socio) return falhar("email_nao_cadastrado", email);
        if (!socio.senhaHash) return falhar("sem_senha_definida", email);
        if (!(await conferirSenha(senha, socio.senhaHash))) return falhar("senha_incorreta", email);

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
