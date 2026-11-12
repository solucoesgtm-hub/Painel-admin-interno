import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/base";
import { listarLeads } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { Checklist } from "./checklist";

export const metadata: Metadata = { title: "Diagnóstico" };

export default async function PaginaDiagnostico({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  await exigirSocio();
  const [leads, p] = await Promise.all([listarLeads(), searchParams]);
  const abertos = leads.filter((l) => ["lead", "visita", "proposta"].includes(l.etapa)).map((l) => ({ id: l.id, nome: l.nome }));
  return (
    <>
      <CabecalhoPagina
        titulo="Diagnóstico"
        descricao="Checklist em seis seções, feito para tocar no celular. Salva a cada alteração no aparelho e funciona sem sinal."
      />
      <Checklist leads={abertos} leadInicial={p.lead} />
    </>
  );
}
