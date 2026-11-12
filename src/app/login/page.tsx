import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Aviso } from "@/components/ui/base";
import { auth, authConfigurado } from "@/auth";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  configuracao: "O login ainda não foi configurado neste ambiente. Defina AUTH_SECRET e DATABASE_URL.",
  removido: "Seu acesso foi removido. Fale com outro sócio.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; erro?: string }> }) {
  const p = await searchParams;
  const erro = ERROS[p.error ?? p.erro ?? ""] ?? (p.error ? "Não foi possível entrar. Tente de novo." : null);
  if (authConfigurado && (await auth())?.user?.id) redirect("/");

  return (
    <main className="relative z-10 grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden p-14 lg:flex">
        <Logo />
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-azul-claro">
            <span aria-hidden className="h-px w-6 bg-azul-claro/60" />
            Sistema interno da GTM
          </p>
          <h1 className="mt-5 text-[56px] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            Funil, entregas, editais e caixa em um só lugar.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-tinta-3">
            Feito para usar no balcão do cliente, pelo celular, e no escritório, pelo computador.
          </p>
        </div>
        <svg aria-hidden viewBox="0 0 480 140" className="w-full max-w-lg">
          <defs>
            <linearGradient id="login-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b82ec" stopOpacity="0.35" />
              <stop offset="1" stopColor="#5b82ec" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,118 L70,102 L140,108 L210,78 L280,72 L350,44 L420,34 L480,14 L480,140 L0,140 Z" fill="url(#login-area)" />
          <polyline points="0,118 70,102 140,108 210,78 280,72 350,44 420,34 480,14" fill="none" stroke="#8fb0ff" strokeWidth="2.5" />
          <polyline points="0,130 70,124 140,120 210,112 280,104 350,100 420,90 480,84" fill="none" stroke="#ff8a4c" strokeWidth="2" strokeDasharray="4 7" />
        </svg>
      </section>

      <section className="flex flex-col justify-center px-5 py-12 sm:px-12">
        <div className="vidro mx-auto w-full max-w-md rounded-3xl border border-areia-2 p-7 shadow-flutuante sm:p-9">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-white">Entrar no GTM Hub</h2>
          <p className="mt-2 text-sm text-tinta-3">Acesso restrito aos sócios, cada um com o próprio e-mail e senha.</p>

          {erro && (
            <Aviso tom="risco" className="mt-6">
              {erro}
            </Aviso>
          )}

          {authConfigurado ? (
            <FormularioLogin />
          ) : (
            <form
              className="mt-8"
              action={async () => {
                "use server";
                redirect("/");
              }}
            >
              <button className="flex min-h-12 w-full items-center justify-center rounded-full bg-azul px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_10px_30px_-10px_rgb(63_111_216/0.75)] hover:bg-[#4b7be6]">
                Abrir demonstração
              </button>
              <p className="mt-3 text-xs text-tinta-3">
                Login ainda não configurado. A demonstração usa apenas dados fictícios.
              </p>
            </form>
          )}

          <p className="mt-10 flex items-center gap-2 text-xs text-tinta-3">
            <ShieldCheck aria-hidden className="size-4 text-ok" /> Só e-mails autorizados entram. Todo acesso fica no histórico.
          </p>
        </div>
      </section>
    </main>
  );
}
