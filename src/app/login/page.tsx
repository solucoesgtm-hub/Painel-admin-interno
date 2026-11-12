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
      <section className="textura-grade relative hidden overflow-hidden bg-grafite p-12 lg:flex lg:flex-col lg:justify-between">
        <Logo />
        <div className="max-w-md">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-azul-claro">Sistema interno</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-offwhite">
            Funil, entregas, editais e caixa da GTM em um só lugar.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#9a9fb5]">
            Feito para usar no balcão do cliente, pelo celular, e no escritório, pelo computador.
          </p>
        </div>
        <svg aria-hidden viewBox="0 0 400 120" className="w-full max-w-md opacity-90">
          <polyline points="0,100 60,86 120,90 180,62 240,58 300,34 360,26 400,12" fill="none" stroke="#7fa2ff" strokeWidth="2.5" />
          <polyline points="0,110 60,104 120,100 180,92 240,84 300,80 360,70 400,64" fill="none" stroke="#3f6fd8" strokeWidth="2" strokeDasharray="4 6" />
        </svg>
      </section>

      <section className="flex flex-col justify-center bg-offwhite px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 inline-flex rounded-lg bg-grafite px-3 py-2 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Entrar no GTM Hub</h2>
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
              <button className="flex min-h-12 w-full items-center justify-center rounded-md bg-azul px-4 text-sm font-medium text-white hover:bg-azul-escuro">
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
