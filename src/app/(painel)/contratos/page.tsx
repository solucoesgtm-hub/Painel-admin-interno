import type { Metadata } from "next";
import { Suspense } from "react";
import { Aviso, CabecalhoPagina } from "@/components/ui/base";
import { data } from "@/lib/formato";
import { estadoContrato } from "@/lib/regras/empresa";
import { listarContratos, listarLeads } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { GestaoContratos } from "./gestao";

export const metadata: Metadata = { title: "Contratos" };

export default async function Contratos() {
  await exigirSocio();
  const [contratos, leads] = await Promise.all([listarContratos(), listarLeads()]);
  const avisos = contratos
    .map((c) => ({ c, e: estadoContrato(c) }))
    .filter(({ e }) => e.tipo === "renovar" || e.tipo === "vencido");

  return (
    <>
      <CabecalhoPagina
        titulo="Contratos"
        descricao="Vigência, valores e situação de cada contrato. O Hub avisa 45 dias antes do fim."
      />

      {avisos.map(({ c, e }) => (
        <Aviso key={c.id} tom={e.tipo === "vencido" ? "risco" : "alerta"} titulo={e.tipo === "vencido" ? "Contrato vencido" : "Renovação próxima"} className="mb-4">
          {c.cliente}: vigência {e.tipo === "vencido" ? "terminou" : "termina"} em {data(c.fim)}. Combine a renovação ou encerre o contrato.
        </Aviso>
      ))}

      <Suspense>
        <GestaoContratos
          contratos={contratos}
          leads={leads.filter((l) => l.etapa !== "perdido").map((l) => ({ id: l.id, nome: l.nome }))}
        />
      </Suspense>
    </>
  );
}
