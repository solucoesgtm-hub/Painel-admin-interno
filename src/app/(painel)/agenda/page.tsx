import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/base";
import { EVENTOS, SOCIOS } from "@/lib/demo/dados";
import { exigirSocio } from "@/lib/sessao";
import { Calendario } from "./calendario";

export const metadata: Metadata = { title: "Agenda" };

export default async function Agenda() {
  await exigirSocio();
  return (
    <>
      <CabecalhoPagina titulo="Agenda"
        descricao="Visitas, próximos passos e prazos de editais. A sincronização com o Google Agenda entra na Fase 4." />
      <Calendario eventos={EVENTOS} socios={SOCIOS} />
    </>
  );
}
