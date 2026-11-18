import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Aviso } from "@/components/ui/base";
import { auth, authConfigurado } from "@/auth";
import { FormularioLogin } from "./formulario";
import { Particulas } from "./particulas";
import { MarcaAnimada } from "./vitrine";

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
    <main className="grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      {/* Lado da marca (computador) */}
      <section className="relative hidden flex-col overflow-hidden bg-[#0e0f12] p-12 text-white lg:flex">
        {/* Grade fina e luzes de fundo */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255/0.6)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.6)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_60%_45%,#000_20%,transparent_70%)]"
        />
        <span aria-hidden className="animate-pulsar pointer-events-none absolute -left-40 -top-40 size-[34rem] rounded-full bg-azul/25 blur-3xl" />
        <span aria-hidden className="animate-pulsar pointer-events-none absolute -bottom-48 right-[-10rem] size-[30rem] rounded-full bg-[#ff8a4c]/12 blur-3xl [animation-delay:2.5s]" />

        <h1 className="sr-only">GTM Soluções</h1>
        <div className="relative grid flex-1 place-items-center">
          <Particulas className="block w-[min(88%,calc(100dvh-6rem),760px)] cursor-pointer text-[#f1f0eb]" />
        </div>
      </section>

      {/* Lado do acesso */}
      <section className="relative flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="vidro-forte animate-revelar mx-auto w-full max-w-md rounded-[26px] p-7 sm:p-9">
          {/* Celular e tablet: marca em cima do cartão */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="rounded-[30%] bg-[#0e0f12] p-5 shadow-flutuante">
              <MarcaAnimada className="size-24" />
            </div>
            <p className="mt-5 text-lg font-semibold tracking-tight text-tinta">GTM Soluções</p>
            <p className="mt-1 max-w-xs text-sm text-tinta-3">Agentes de IA e automação para negócios do interior do ES.</p>
          </div>

          <h2 className="animate-revelar atraso-1 text-[28px] font-semibold tracking-[-0.03em] text-tinta max-lg:text-center">Entrar no GTM Hub</h2>
          <p className="animate-revelar atraso-2 mt-2 text-sm text-tinta-3 max-lg:text-center">Acesso restrito aos sócios, cada um com o próprio e-mail e senha.</p>

          {erro && (
            <Aviso tom="risco" className="mt-6">
              {erro}
            </Aviso>
          )}

          <div className="animate-revelar atraso-3">
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
                <button className="reflexo flex min-h-12 w-full items-center justify-center rounded-full bg-azul px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_10px_30px_-10px_rgb(63_111_216/0.75)] transition-transform hover:bg-[#3461c9] active:scale-[0.98]">
                  Abrir demonstração
                </button>
                <p className="mt-3 text-xs text-tinta-3">Login ainda não configurado. A demonstração usa apenas dados fictícios.</p>
              </form>
            )}
          </div>

          <p className="animate-revelar atraso-4 mt-10 flex items-center gap-2 text-xs text-tinta-3">
            <ShieldCheck aria-hidden className="size-4 shrink-0 text-ok" /> Só e-mails autorizados entram. Todo acesso fica no histórico.
          </p>
        </div>
      </section>
    </main>
  );
}
