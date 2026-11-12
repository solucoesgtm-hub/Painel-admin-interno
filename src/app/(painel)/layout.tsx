import { cookies } from "next/headers";
import { Casca } from "@/components/layout/casca";
import { ProvedorAvisos } from "@/components/ui/toast";
import { APROVACOES } from "@/lib/demo/dados";
import { data, diaSemana, hojeISO } from "@/lib/formato";
import { estaParado, nomeEtapa } from "@/lib/regras/funil";
import { listarLeads, modoDemo } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { signOut } from "@/auth";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const socio = await exigirSocio();
  const [leads, jar] = await Promise.all([listarLeads(), cookies()]);
  const contadores = {
    "/leads": leads.filter((l) => estaParado(l.etapa, l.etapaDesde)).length,
    "/automacao": APROVACOES.length,
  };
  const hoje = hojeISO();

  async function sair() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <ProvedorAvisos>
      <Casca
        contadores={contadores}
        usuario={{ nome: socio.nome, email: socio.email, cor: socio.cor, demo: socio.demo }}
        sair={socio.demo ? undefined : sair}
        recolhidaInicial={jar.get("gtm-menu")?.value === "recolhido"}
        leads={leads.map((l) => ({ id: l.id, nome: l.nome, etapa: nomeEtapa(l.etapa), cidade: l.cidade }))}
        data={`${diaSemana(hoje)}, ${data(hoje)}`}
        selo={modoDemo ? "Demonstração" : "Parte em demonstração"}
      >
        {children}
      </Casca>
    </ProvedorAvisos>
  );
}
