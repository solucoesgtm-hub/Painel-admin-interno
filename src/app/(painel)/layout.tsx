import { Casca } from "@/components/layout/casca";
import { ProvedorConfirmacao } from "@/components/ui/confirmar";
import { ProvedorAvisos } from "@/components/ui/toast";
import { APROVACOES } from "@/lib/demo/dados";
import { data, diaSemana, hojeISO } from "@/lib/formato";
import { estaParado, nomeEtapa } from "@/lib/regras/funil";
import { contarMensagensNaoLidas, listarLeads, modoDemo } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { fotoDoSocio } from "@/lib/regras/avatar";
import { chavePublicaPush } from "@/lib/push";
import { signOut } from "@/auth";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const socio = await exigirSocio();
  const [leads, naoLidas] = await Promise.all([listarLeads(), contarMensagensNaoLidas(socio)]);
  const contadores = {
    "/leads": leads.filter((l) => estaParado(l.etapa, l.etapaDesde)).length,
    "/automacao": APROVACOES.length,
    "/chat": naoLidas,
  };
  const hoje = hojeISO();

  async function sair() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <ProvedorAvisos>
      <ProvedorConfirmacao>
      <Casca
        contadores={contadores}
        usuario={{ nome: socio.nome, email: socio.email, cor: socio.cor, demo: socio.demo, foto: fotoDoSocio(socio) }}
        sair={socio.demo ? undefined : sair}
        leads={leads.map((l) => ({ id: l.id, nome: l.nome, etapa: nomeEtapa(l.etapa), cidade: l.cidade }))}
        data={`${diaSemana(hoje)}, ${data(hoje)}`}
        selo={modoDemo ? "Demonstração" : "Parte em demonstração"}
        chavePush={chavePublicaPush()}
      >
        {children}
      </Casca>
      </ProvedorConfirmacao>
    </ProvedorAvisos>
  );
}
