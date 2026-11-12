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
        const falhar = async () => {
          // Tempo mínimo constante: dificulta tentativa em massa e não revela se o e-mail existe.
          await esperar(Math.max(0, 800 - (Date.now() - inicio)));
          throw new LoginInvalido();
        };

        const r = esquemaLogin.safeParse(entrada);
        if (!r.success) return falhar();
        const { email, senha } = r.data;
        if (emailsAutorizados.length && !emailsAutorizados.includes(email)) return falhar();

        const [{ db }, { socios }, { eq }, { conferirSenha }] = await Promise.all([
          import("@/db"),
          import("@/db/schema"),
          import("drizzle-orm"),
          import("@/lib/senha"),
        ]);
        const socio = await db.query.socios.findFirst({ where: eq(socios.email, email) });
        if (!socio || !(await conferirSenha(senha, socio.senhaHash))) return falhar();

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
