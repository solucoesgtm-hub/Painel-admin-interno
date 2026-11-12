import type { Metadata } from "next";
import { BarChart3, Info } from "lucide-react";
import { GraficoBarrasH, GraficoColunas, SERIES } from "@/components/graficos";
import { CabecalhoCartao, CabecalhoPagina, Cartao, EstadoVazio, Metrica, Tabela, Td, Th, Tr } from "@/components/ui/base";
import { ANALISE } from "@/lib/demo/dados";
import { pct } from "@/lib/formato";
import { calcularAnalise } from "@/lib/regras/analise";
import { listarLeads, modoDemo } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export const metadata: Metadata = { title: "Análise de leads" };

export default async function Analise() {
  await exigirSocio();
  // Na demonstração usa o histórico fictício; com o banco ligado, calcula a partir dos leads reais.
  const leads = modoDemo ? [] : await listarLeads();
  const A = modoDemo ? ANALISE : calcularAnalise(leads);
  const c = A.conversao;
  const conversaoTotal = c[0]!.total ? c.at(-1)!.total / c[0]!.total : 0;
  const cicloMedio = A.tempoMedio.slice(0, 4).reduce((a, t) => a + t.dias, 0);
  const calib = A.calibracao.map((x) => ({ ...x, taxa: x.leads ? Math.round((x.fecharam / x.leads) * 100) : 0 }));
  const comDiagnostico = calib.reduce((a, x) => a + x.leads, 0);

  const cabecalho = (
    <CabecalhoPagina titulo="Análise de leads"
      descricao="Onde o funil perde força, de onde vêm os melhores leads e se a pontuação do diagnóstico acerta o resultado." />
  );

  if (!modoDemo && leads.length === 0) {
    return (
      <>
        {cabecalho}
        <Cartao>
          <EstadoVazio icone={BarChart3} titulo="Ainda não há leads para analisar"
            texto="Cadastre os primeiros leads no funil. A conversão, as origens e os motivos de perda aparecem aqui sozinhos." />
        </Cartao>
      </>
    );
  }

  return (
    <>
      {cabecalho}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Metrica className="animate-surgir escala-1" rotulo="Conversão lead → fechado" valor={pct(conversaoTotal)} detalhe={`${c.at(-1)!.total} de ${c[0]!.total} leads${modoDemo ? " nos últimos 6 meses" : ""}`} />
        <Metrica className="animate-surgir escala-2" rotulo={modoDemo ? "Ciclo médio de venda" : "Tempo parado no funil"} valor={`${cicloMedio} dias`} detalhe={modoDemo ? "Do primeiro contato ao fechamento" : "Soma da média de dias na etapa atual, de Lead a Fechado"} />
        <Metrica className="animate-surgir escala-3" rotulo="Principal origem" valor={A.origem[0]?.origem ?? "—"} detalhe={`${A.origem[0]?.total ?? 0} leads vieram por ela`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Cartao className="animate-surgir escala-2">
          <CabecalhoCartao titulo="Conversão por etapa" descricao="Quantos leads chegaram a cada etapa" />
          <div className="p-5">
            <ol className="space-y-3">
              {c.map((e, i) => {
                const largura = c[0]!.total ? e.total / c[0]!.total : 0;
                const taxa = i > 0 && c[i - 1]!.total ? e.total / c[i - 1]!.total : null;
                return (
                  <li key={e.etapa} className="grid grid-cols-[88px_1fr_auto] items-center gap-3">
                    <span className="text-sm text-tinta-2">{e.etapa}</span>
                    <div className="h-8 rounded-[4px] bg-offwhite">
                      <div className="flex h-full items-center rounded-[4px] bg-azul px-2.5 text-xs font-medium text-white" style={{ width: `${Math.max(largura * 100, 12)}%`, opacity: 1 - i * 0.14 }}>
                        <span className="numeros">{e.total}</span>
                      </div>
                    </div>
                    <span className="numeros w-16 text-right text-xs text-tinta-3">{taxa === null ? "—" : `${pct(taxa)} passam`}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </Cartao>

        <Cartao className="animate-surgir escala-3">
          <CabecalhoCartao titulo={modoDemo ? "Tempo médio em cada etapa" : "Dias na etapa atual"} descricao={modoDemo ? "Em dias" : "Média dos leads que estão em cada etapa hoje"} />
          <div className="px-3 pb-4 pt-4 sm:px-5">
            <GraficoColunas dados={A.tempoMedio} x="etapa" series={[{ chave: "dias", nome: "Tempo médio" }]} formato="dias" rotuloTopo altura={240} />
          </div>
        </Cartao>

        <Cartao className="animate-surgir escala-3">
          <CabecalhoCartao titulo="Leads por origem" />
          <div className="p-5"><GraficoBarrasH dados={A.origem} rotulo="origem" valor="total" nome="Leads" larguraRotulo={130} /></div>
        </Cartao>

        <Cartao className="animate-surgir escala-4">
          <CabecalhoCartao titulo="Leads por segmento" />
          <div className="p-5"><GraficoBarrasH dados={A.segmento} rotulo="segmento" valor="total" nome="Leads" cor={SERIES[2]} larguraRotulo={100} /></div>
        </Cartao>

        <Cartao className="animate-surgir escala-4">
          <CabecalhoCartao titulo="Motivos de perda" descricao="Informados ao marcar um lead como Perdido" />
          <div className="p-5"><GraficoBarrasH dados={A.motivosPerda} rotulo="motivo" valor="total" nome="Leads perdidos" cor={SERIES[1]} larguraRotulo={180} /></div>
        </Cartao>

        <Cartao className="animate-surgir escala-5">
          <CabecalhoCartao titulo="Pontuação × resultado real" descricao="Calibração dos pesos do diagnóstico" />
          <Tabela rotulo="Calibração da pontuação" className="[&_table]:min-w-0">
            <thead><tr><Th>Faixa</Th><Th className="text-right">Leads</Th><Th className="text-right">Fecharam</Th><Th>Taxa</Th></tr></thead>
            <tbody>
              {calib.map((x) => (
                <Tr key={x.faixa}>
                  <Td className="text-[13px]">{x.faixa}</Td>
                  <Td className="numeros text-right">{x.leads}</Td>
                  <Td className="numeros text-right">{x.fecharam}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-areia"><div className="h-full rounded-full bg-azul" style={{ width: `${x.taxa}%` }} /></div>
                      <span className="numeros text-xs font-medium">{x.taxa}%</span>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Tabela>
          <p className="flex gap-2 border-t border-areia px-5 py-3 text-xs text-tinta-3">
            <Info aria-hidden className="size-4 shrink-0" />
            {comDiagnostico === 0
              ? "Ainda não há diagnósticos salvos. Faça o checklist nas visitas para comparar a pontuação com o resultado."
              : calib[2]!.leads === 0 || calib[0]!.leads === 0
                ? "Faltam leads Quentes ou Frios com diagnóstico para comparar. Com mais visitas, a diferença aparece aqui."
                : `Quentes fecham ${calib[2]!.taxa}% e Frios ${calib[0]!.taxa}%. Se a diferença diminuir, revise os pesos.`}
          </p>
        </Cartao>
      </div>
    </>
  );
}
