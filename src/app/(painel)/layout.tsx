import { LogOut, FlaskConical } from "lucide-react";
import { BarraInferior, MenuLateral } from "@/components/layout/navegacao";
import { Logo } from "@/components/layout/logo";
import { Avatar } from "@/components/ui/base";
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

  const rodape = (
    <div className="flex items-center gap-3 rounded-md px-2 py-1.5">
      <Avatar nome={socio.nome} cor={socio.cor} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{socio.nome}</p>
        <p className="truncate text-xs text-[#8b90a6]">{socio.demo ? "Modo demonstração" : socio.email}</p>
      </div>
      {!socio.demo && (
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            aria-label="Sair"
            className="grid size-10 place-items-center rounded-md text-[#8b90a6] hover:bg-grafite-3 hover:text-white"
          >
            <LogOut aria-hidden className="size-4" />
          </button>
        </form>
      )}
    </div>
  );

  return (
    <ProvedorAvisos>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-azul focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <MenuLateral contadores={contadores} rodape={rodape} />

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-areia/80 bg-offwhite/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6 lg:h-16 lg:px-10">
            <div className="lg:hidden">
              <span className="inline-flex rounded-md bg-grafite px-2.5 py-1.5">
                <Logo />
              </span>
            </div>
            <p className="hidden text-sm text-tinta-3 lg:block">
              <span className="inline-block first-letter:uppercase">{diaSemana(hoje)}</span>, {data(hoje)} · Marilândia, ES
            </p>
            <div className="flex items-center gap-2">
              {(socio.demo || modoDemo) && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-alerta-suave px-2.5 py-1 text-xs font-medium text-alerta ring-1 ring-inset ring-alerta/25"
                  title="Dados fictícios. Configure DATABASE_URL e o login Google para usar dados reais."
                >
                  <FlaskConical aria-hidden className="size-3.5" />
                  <span className="hidden sm:inline">Demonstração · dados fictícios</span>
                  <span className="sm:hidden">Demo</span>
                </span>
              )}
              <span className="lg:hidden">
                <Avatar nome={socio.nome} cor={socio.cor} />
              </span>
            </div>
          </div>
        </header>

        <main id="conteudo" className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-8">
          {children}
        </main>
      </div>

      <BarraInferior contadores={contadores} rodape={rodape} />
    </ProvedorAvisos>
  );
}
