import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bot, CalendarCheck2, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Aviso, cn } from "@/components/ui/base";
import { auth, authConfigurado } from "@/auth";
import { FormularioLogin } from "./formulario";
import { Particulas } from "./particulas";
import { MarcaAnimada } from "./vitrine";

export const metadata: Metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  configuracao: "O login ainda não foi configurado neste ambiente. Defina AUTH_SECRET e DATABASE_URL.",
  removido: "Seu acesso foi removido. Fale com outro sócio.",
};

const PILARES = [
  { icone: MessageCircle, texto: "Atendentes de IA no WhatsApp" },
  { icone: CalendarCheck2, texto: "Agendamento automático" },
  { icone: Bot, texto: "Automação de rotinas e estoque" },
];

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; erro?: string }> }) {
  const p = await searchParams;
  const erro = ERROS[p.error ?? p.erro ?? ""] ?? (p.error ? "Não foi possível entrar. Tente de novo." : null);
  if (authConfigurado && (await auth())?.user?.id) redirect("/");

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      {/* Lado da marca (computador) */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#0e0f12] p-12 text-white lg:flex xl:p-16 [@media(max-height:820px)]:py-8">
        {/* Grade fina e luzes de fundo */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255/0.6)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.6)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_60%_45%,#000_20%,transparent_70%)]"
        />
        <span aria-hidden className="animate-pulsar pointer-events-none absolute -left-40 -top-40 size-[34rem] rounded-full bg-azul/25 blur-3xl" />
        <span aria-hidden className="animate-pulsar pointer-events-none absolute -bottom-48 right-[-10rem] size-[30rem] rounded-full bg-[#ff8a4c]/12 blur-3xl [animation-delay:2.5s]" />

        <span className="animate-revelar relative">
          <Logo />
        </span>

        <div className="relative">
          <Particulas className="animate-surgir-marca -ml-6 mb-8 block w-[300px] cursor-pointer text-azul-claro xl:w-[360px] [@media(max-height:820px)]:mb-3 [@media(max-height:820px)]:w-[210px]" />
          <div className="max-w-xl">
            <p className="animate-revelar atraso-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#c9cedb]">
              <Sparkles aria-hidden className="size-3.5 text-azul-claro" />
              GTM Soluções · Marilândia, ES
            </p>
            <h1 className="animate-revelar atraso-2 mt-6 text-[46px] font-semibold leading-[1.04] tracking-[-0.04em] xl:text-[56px] [@media(max-height:820px)]:mt-4 [@media(max-height:820px)]:text-[40px]">
              Tecnologia que atende, agenda e vende{" "}
              <span className="text-azul-claro">pelo seu cliente.</span>
            </h1>
            <p className="animate-revelar atraso-3 mt-5 max-w-md text-base leading-relaxed text-[#b4bacb]">
              Criamos agentes de inteligência artificial e automações sob medida para comércios e clínicas do interior do
              Espírito Santo — do primeiro diagnóstico à manutenção de todo mês.
            </p>
            <ul className="mt-8 flex flex-wrap gap-2 [@media(max-height:820px)]:mt-5">
              {PILARES.map(({ icone: Icone, texto }, i) => (
                <li
                  key={texto}
                  className={cn(
                    "animate-revelar inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-[13px] text-[#dfe3ec] backdrop-blur",
                    ["atraso-4", "atraso-5", "atraso-6"][i],
                  )}
                >
                  <Icone aria-hidden className="size-4 text-azul-claro" />
                  {texto}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="animate-revelar atraso-6 relative flex items-center gap-2 text-xs text-[#8b91a5]">
          <span className="size-1.5 rounded-full bg-ok" aria-hidden />
          Painel interno dos sócios · acesso protegido
        </p>
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
