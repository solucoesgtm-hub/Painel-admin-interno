import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/base";
import { listarLeads, listarSocios } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { Funil } from "./funil";

export const metadata: Metadata = { title: "Leads e clientes" };

export default async function PaginaLeads({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const socio = await exigirSocio();
  const [leads, socios, p] = await Promise.all([listarLeads(), listarSocios(), searchParams]);
  return (
    <>
      <CabecalhoPagina
        titulo="Leads e clientes"
        descricao="Do primeiro contato à manutenção. Todo card tem dono, próximo passo e data; cards parados há mais de 7 dias ficam marcados."
      />
      <Funil leadsIniciais={leads} socios={socios} socioAtualId={socio.id} abrirNovo={p.novo === "1"} />
    </>
  );
}
