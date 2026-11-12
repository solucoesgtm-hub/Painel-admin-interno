// Login com Google (Auth.js). Só entra quem tem o e-mail na lista SOCIOS_EMAILS.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const emailsAutorizados = (process.env.SOCIOS_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authConfigurado = Boolean(
  process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ user }) {
      const email = user.email?.toLowerCase();
      return Boolean(email && emailsAutorizados.includes(email));
    },
  },
});
