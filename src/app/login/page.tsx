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
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-grafite p-14 lg:flex">
        <span aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-azul/30 blur-3xl" />
        <span className="relative"><Logo /></span>
        <div className="relative max-w-xl">
          <h1 className="text-[56px] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            Funil, entregas, editais e caixa em um só lugar.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-nevoa">
            Feito para usar no balcão do cliente, pelo celular, e no escritório, pelo computador.
          </p>
        </div>
        <svg aria-hidden viewBox="0 0 480 140" className="relative w-full max-w-lg">
          <defs>
            <linearGradient id="login-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#5b82ec" stopOpacity="0.35" />
              <stop offset="1" stopColor="#5b82ec" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,118 L70,102 L140,108 L210,78 L280,72 L350,44 L420,34 L480,14 L480,140 L0,140 Z" fill="url(#login-area)" />
          <polyline points="0,118 70,102 140,108 210,78 280,72 350,44 420,34 480,14" fill="none" stroke="#8fb0ff" strokeWidth="2.5" />
          <polyline points="0,130 70,124 140,120 210,112 280,104 350,100 420,90 480,84" fill="none" stroke="#ff9a62" strokeWidth="2" strokeDasharray="4 7" />
        </svg>
      </section>

      <section className="flex flex-col justify-center px-5 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-areia bg-papel p-7 shadow-flutuante sm:p-9">
          <div className="mb-8 lg:hidden">
            <Logo escuro />
          </div>
          <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-tinta">Entrar no GTM Hub</h2>
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
              <button className="flex min-h-12 w-full items-center justify-center rounded-full bg-azul px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_10px_30px_-10px_rgb(63_111_216/0.75)] hover:bg-azul-escuro">
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
