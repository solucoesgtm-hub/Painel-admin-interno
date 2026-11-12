import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { CabecalhoCartao, CabecalhoPagina, Cartao, Etiqueta, Medidor, Tabela, Td, Th, Tr } from "@/components/ui/base";
import { AGENTES, APROVACOES } from "@/lib/demo/dados";
import { brl, dataHora } from "@/lib/formato";
import { exigirSocio } from "@/lib/sessao";
import { CaixaAprovacoes } from "./caixa";

export const metadata: Metadata = { title: "Automação" };

export default async function Automacao() {
  const socio = await exigirSocio();
  const custoTotal = AGENTES.reduce((a, g) => a + g.custoMes, 0);
  const tetoTotal = AGENTES.reduce((a, g) => a + g.teto, 0);
  return (
    <>
      <CabecalhoPagina sobretitulo="Gestão" titulo="Automação"
        descricao="Ações preparadas por agentes esperam um sócio aprovar, editar ou recusar. Nada sai do sistema sem decisão humana." />

      <CaixaAprovacoes iniciais={APROVACOES} socioNome={socio.nome} />

      <Cartao className="mt-4 animate-surgir escala-3">
        <CabecalhoCartao titulo="Painel de agentes" descricao={`Custo de IA no mês: ${brl(custoTotal)} de ${brl(tetoTotal)}`} />
        <Tabela rotulo="Agentes">
          <thead><tr><Th>Agente</Th><Th>Situação</Th><Th>Gatilho</Th><Th>Última execução</Th><Th>Custo × teto</Th></tr></thead>
          <tbody>
            {AGENTES.map((g) => {
              const uso = g.custoMes / g.teto;
              return (
                <Tr key={g.id}>
                  <Td className="font-medium">{g.nome}</Td>
                  <Td>{g.situacao === "ativo" ? <Etiqueta tom="ok">Ativo</Etiqueta> : g.situacao === "pausado" ? <Etiqueta tom="neutro">Pausado</Etiqueta> : <Etiqueta tom="risco">Com erro</Etiqueta>}</Td>
                  <Td className="text-[13px] text-tinta-2">{g.gatilho}</Td>
                  <Td className="numeros text-[13px] text-tinta-2">{dataHora(g.ultimaExecucao)}</Td>
                  <Td className="w-48">
                    <div className="flex items-center justify-between text-xs"><span className="numeros">{brl(g.custoMes)}</span><span className="numeros text-tinta-3">{brl(g.teto)}</span></div>
                    <div className="mt-1"><Medidor valor={uso} rotulo={`Uso do teto de ${g.nome}`} tom={uso >= 0.8 ? "alerta" : "azul"} /></div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Tabela>
      </Cartao>

      <Cartao className="mt-4 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound aria-hidden className="size-4 text-azul" />Ponto de entrada do n8n</p>
        <p className="mt-1 text-sm text-tinta-3">
          <code className="rounded bg-offwhite px-1.5 py-0.5 text-[13px]">POST /api/n8n/execucoes</code> e{" "}
          <code className="rounded bg-offwhite px-1.5 py-0.5 text-[13px]">POST /api/n8n/aprovacoes</code>, autenticados por chave de API. Entram na Fase 7.
        </p>
      </Cartao>
    </>
  );
}
