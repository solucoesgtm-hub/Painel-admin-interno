import type { Metadata } from "next";
import { CalendarCheck2 } from "lucide-react";
import { Aviso, CabecalhoPagina, Etiqueta } from "@/components/ui/base";
import { emailContaServico } from "@/lib/google-agenda";
import { hojeISO, somarDias } from "@/lib/formato";
import { AGENDA_GTM } from "@/lib/regras/agenda";
import { listarEventos, listarSocios } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { Calendario } from "./calendario";

export const metadata: Metadata = { title: "Agenda" };

/** Janela lida do Google: 2 meses para trás e 6 para frente. */
const DIAS_ANTES = 62;
const DIAS_DEPOIS = 186;

export default async function Agenda() {
  const socio = await exigirSocio();
  const hoje = hojeISO();
  const [socios, agenda] = await Promise.all([listarSocios(), listarEventos(somarDias(hoje, -DIAS_ANTES), somarDias(hoje, DIAS_DEPOIS))]);
  const google = agenda.fonte === "google";
  const conta = emailContaServico();
  // No Google, eventos criados direto lá (sem sócio marcado) ficam sob "Agenda da GTM".
  const donos = google ? [...socios, { id: AGENDA_GTM, nome: "Agenda da GTM", cor: "#6b7280", email: "", area: "", foco: "" }] : socios;

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda"
        descricao={
          google
            ? "Visitas, próximos passos e prazos de editais, direto do Google Agenda da GTM. O que muda lá aparece aqui."
            : "Visitas, próximos passos e prazos de editais. Em demonstração até o Google Agenda ser ligado."
        }
        acoes={google ? <Etiqueta tom="ok" icone={CalendarCheck2}>Google Agenda ligado</Etiqueta> : undefined}
      />
      {agenda.erro && (
        <Aviso tom="risco" titulo="Não foi possível ler o Google Agenda" className="mb-4">
          {agenda.erro} {conta && <>Confira se a agenda está compartilhada com <strong className="break-all">{conta}</strong> com permissão para fazer alterações.</>}
        </Aviso>
      )}
      {!google && (
        <Aviso tom="info" titulo="Google Agenda ainda não ligado" className="mb-4">
          Os eventos abaixo são de demonstração e os novos ficam só neste servidor. Para usar a agenda real, siga o passo a passo em docs/GOOGLE-AGENDA.md.
        </Aviso>
      )}
      <Calendario eventos={agenda.eventos} socios={donos} socioAtualId={socio.id} google={google} />
    </>
  );
}
