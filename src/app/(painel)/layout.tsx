import { FlaskConical } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { BarraInferior, MenuLateral } from "@/components/layout/navegacao";
import { ProvedorAvisos } from "@/components/ui/toast";
import { APROVACOES } from "@/lib/demo/dados";
import { data, diaSemana, hojeISO } from "@/lib/formato";
import { estaParado } from "@/lib/regras/funil";
import { listarLeads, modoDemo } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { signOut } from "@/auth";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const socio = await exigirSocio();
  const leads = await listarLeads();
  const contadores = {
    "/leads": leads.filter((l) => estaParado(l.etapa, l.etapaDesde)).length,
    "/automacao": APROVACOES.length,
  };
  const hoje = hojeISO();
  const usuario = { nome: socio.nome, email: socio.email, cor: socio.cor, demo: socio.demo };

  async function sair() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  const acaoSair = socio.demo ? undefined : sair;

  return (
    <ProvedorAvisos>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-azul focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <MenuLateral contadores={contadores} usuario={usuario} sair={acaoSair} />

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-areia/70 bg-offwhite/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-16 lg:px-10">
            <span className="lg:hidden">
              <Logo escuro />
            </span>
            <p className="hidden text-sm text-tinta-3 lg:block">
              <span className="inline-block first-letter:uppercase">{diaSemana(hoje)}</span>, {data(hoje)} · Marilândia, ES
            </p>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-alerta-suave px-3 py-1.5 text-xs font-medium text-alerta ring-1 ring-inset ring-alerta/20"
              title={modoDemo ? "Tudo em dados fictícios." : "Algumas telas ainda mostram dados fictícios."}
            >
              <FlaskConical aria-hidden className="size-3.5" />
              {modoDemo ? "Demonstração" : "Parte em demonstração"}
            </span>
          </div>
        </header>

        <main id="conteudo" className="mx-auto max-w-[1320px] px-4 pb-28 pt-8 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>

      <BarraInferior contadores={contadores} usuario={usuario} sair={acaoSair} />
    </ProvedorAvisos>
  );
}
