import { FlaskConical } from "lucide-react";
import { BarraInferior, BarraTopo } from "@/components/layout/navegacao";
import { ProvedorAvisos } from "@/components/ui/toast";
import { APROVACOES } from "@/lib/demo/dados";
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

  async function sair() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  // Na Fase atual, financeiro, editais, projetos etc. ainda usam dados de exemplo.
  const selo = (
    <span
      className="hidden items-center gap-1.5 rounded-full border border-alerta/25 bg-alerta-suave px-3 py-1.5 text-xs font-medium text-alerta md:inline-flex"
      title={modoDemo ? "Tudo em dados fictícios." : "Algumas telas ainda mostram dados fictícios."}
    >
      <FlaskConical aria-hidden className="size-3.5" />
      {modoDemo ? "Demonstração" : "Parte em demonstração"}
    </span>
  );

  return (
    <ProvedorAvisos>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-azul focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <div className="relative z-10">
        <BarraTopo
          contadores={contadores}
          usuario={{ nome: socio.nome, email: socio.email, cor: socio.cor, demo: socio.demo }}
          selo={selo}
          sair={socio.demo ? undefined : sair}
        />
        <main id="conteudo" className="mx-auto max-w-[1440px] px-4 pb-32 pt-8 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
          {children}
        </main>
      </div>
      <BarraInferior contadores={contadores} />
    </ProvedorAvisos>
  );
}
