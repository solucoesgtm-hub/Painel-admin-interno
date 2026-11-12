import type { Metadata } from "next";
import { BellRing, FilePlus2, FileText } from "lucide-react";
import { Aviso, Botao, CabecalhoCartao, CabecalhoPagina, Cartao, Etiqueta, Tabela, Td, Th, Tr } from "@/components/ui/base";
import { CONTRATOS } from "@/lib/demo/dados";
import { brl, data, diasEntre, hojeISO } from "@/lib/formato";
import { exigirSocio } from "@/lib/sessao";

export const metadata: Metadata = { title: "Contratos" };

export default async function Contratos() {
  await exigirSocio();
  const hoje = hojeISO();
  const renovar = CONTRATOS.filter((c) => c.assinado && diasEntre(hoje, c.fim) <= 45 && diasEntre(hoje, c.fim) >= 0);
  return (
    <>
      <CabecalhoPagina titulo="Contratos"
        descricao="Modelo preenchido com os dados do cliente e da proposta, PDF assinado, vigência e alerta de renovação."
        acoes={<Botao icone={FilePlus2} disabled title="Disponível na Fase 6">Gerar contrato</Botao>} />

      {renovar.map((c) => (
        <Aviso key={c.id} tom="alerta" titulo="Renovação próxima" className="mb-4">
          {c.cliente}: vigência termina em {data(c.fim)} ({diasEntre(hoje, c.fim)} dias). Combine a renovação com o cliente.
        </Aviso>
      ))}

      <Cartao className="animate-surgir">
        <CabecalhoCartao titulo="Contratos" descricao={`${CONTRATOS.filter((c) => c.assinado).length} assinados · ${CONTRATOS.filter((c) => !c.assinado).length} aguardando`} />
        <Tabela rotulo="Contratos">
          <thead><tr><Th>Cliente</Th><Th>Vigência</Th><Th>Situação</Th><Th>Documento</Th><Th className="text-right">Mensal</Th></tr></thead>
          <tbody>
            {CONTRATOS.map((c) => {
              const restam = diasEntre(hoje, c.fim);
              return (
                <Tr key={c.id}>
                  <Td><p className="font-medium">{c.cliente}</p><p className="text-xs text-tinta-3">{c.produto}</p></Td>
                  <Td className="numeros text-[13px]">{data(c.inicio)} – {data(c.fim)}</Td>
                  <Td>
                    {!c.assinado ? <Etiqueta tom="alerta">Aguardando assinatura</Etiqueta>
                      : restam <= 45 ? <Etiqueta tom="alerta" icone={BellRing}>Renovar em {restam} dias</Etiqueta>
                      : <Etiqueta tom="ok">Vigente</Etiqueta>}
                  </Td>
                  <Td>{c.assinado ? <span className="inline-flex items-center gap-1.5 text-[13px] text-azul"><FileText aria-hidden className="size-4" />PDF assinado</span> : <span className="text-[13px] text-tinta-3">—</span>}</Td>
                  <Td className="numeros text-right">{brl(c.valorMensal)}</Td>
                </Tr>
              );
            })}
          </tbody>
        </Tabela>
      </Cartao>
    </>
  );
}
