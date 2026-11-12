import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CalendarClock, Flame, Inbox, Repeat, TrendingUp, Wallet } from "lucide-react";
import { GraficoColunas } from "@/components/graficos";
import {
  Avatar,
  BotaoLink,
  CabecalhoCartao,
  CabecalhoPagina,
  Cartao,
  Etiqueta,
  EstadoVazio,
  Medidor,
  Metrica,
} from "@/components/ui/base";
import { APROVACOES, EDITAIS, FATURAMENTO_MESES, MEI, MENSALIDADES, SOCIOS } from "@/lib/demo/dados";
import { brl, dataCurta, diasEntre, hojeISO, pct, relativo, somarDias } from "@/lib/formato";
import { estaParado } from "@/lib/regras/funil";
import { limiteMei, situacaoMei } from "@/lib/regras/mei";
import { situacaoMensalidade } from "@/lib/regras/financeiro";
import { listarLeads } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

function saudacao() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function Inicio() {
  const socio = await exigirSocio();
  const leads = await listarLeads();
  const hoje = hojeISO();
  const fimSemana = somarDias(hoje, 7);

  const mesAtual = FATURAMENTO_MESES.at(-1)!;
  const mesAnterior = FATURAMENTO_MESES.at(-2)!;
  const variacao = (mesAtual.entradas - mesAnterior.entradas) / mesAnterior.entradas;
  const mrr = MENSALIDADES.reduce((a, m) => a + m.valor, 0);
  const atrasadas = MENSALIDADES.filter((m) => situacaoMensalidade(m.vencimento, m.pagoEm) === "atrasado");
  const quentes = leads.filter((l) => l.veredito === "quente" && !["perdido", "manutencao"].includes(l.etapa));
  const parados = leads.filter((l) => estaParado(l.etapa, l.etapaDesde));

  const anoAtual = Number(hoje.slice(0, 4));
  const limite = limiteMei(anoAtual, new Date(`${MEI.abertura}T12:00:00`));
  const mei = situacaoMei(MEI.faturadoNoAno, limite);

  const editais = EDITAIS.filter((e) => ["em_analise", "aplicando"].includes(e.situacao)).sort((a, b) => a.prazo.localeCompare(b.prazo));
  const passos = leads
    .filter((l) => l.etapa !== "perdido" && l.proximoPassoData <= fimSemana)
    .sort((a, b) => a.proximoPassoData.localeCompare(b.proximoPassoData));

  return (
    <>
      <CabecalhoPagina
        sobretitulo="Resumo do dia"
        titulo={`${saudacao()}, ${socio.nome}`}
        descricao="O que precisa de atenção hoje: caixa, funil, aprovações e prazos."
        acoes={
          <>
            <BotaoLink href="/diagnostico" icone={ArrowUpRight}>Novo diagnóstico</BotaoLink>
            <BotaoLink href="/leads?novo=1" variante="primario">Novo lead</BotaoLink>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica className="animate-surgir escala-1" rotulo="Faturamento do mês" valor={brl(mesAtual.entradas)} icone={Wallet} tom="azul"
          detalhe={<span className={variacao >= 0 ? "text-ok" : "text-risco"}>{variacao >= 0 ? "▲" : "▼"} {pct(Math.abs(variacao))} vs. mês anterior</span>} />
        <Metrica className="animate-surgir escala-2" rotulo="Mensalidades ativas" valor={brl(mrr)} icone={Repeat} tom="ok"
          detalhe={<>{MENSALIDADES.length} contratos · {atrasadas.length > 0 ? <span className="text-risco">{atrasadas.length} em atraso</span> : "nenhum em atraso"}</>} />
        <Metrica className="animate-surgir escala-3" rotulo="Leads quentes" valor={quentes.length} icone={Flame} tom="risco"
          detalhe={parados.length ? <span className="inline-flex items-center gap-1 text-alerta"><AlertTriangle aria-hidden className="size-3.5" />{parados.length} parados há +7 dias</span> : "Nenhum card parado"} />
        <Metrica className="animate-surgir escala-4" rotulo="Aprovações pendentes" valor={APROVACOES.length} icone={Inbox} tom="alerta"
          detalhe={<Link href="/automacao" className="text-azul underline-offset-2 hover:underline">Abrir caixa de aprovações</Link>} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Cartao className="animate-surgir escala-2 xl:col-span-2">
          <CabecalhoCartao titulo="Entradas por mês" descricao="Últimos 6 meses, em reais"
            acao={<BotaoLink href="/financeiro" variante="fantasma" className="min-h-9 px-2 text-azul">Financeiro</BotaoLink>} />
          <div className="px-3 pb-4 pt-5 sm:px-5">
            <GraficoColunas dados={FATURAMENTO_MESES} x="mes" series={[{ chave: "entradas", nome: "Entradas" }]} formato="brl" rotuloTopo destaqueUltimo />
          </div>
        </Cartao>

        <Cartao className="animate-surgir escala-3 flex flex-col">
          <CabecalhoCartao titulo="Teto do MEI" descricao={`Faturado em ${anoAtual} contra o limite`} />
          <div className="flex flex-1 flex-col justify-between gap-6 p-5">
            <div>
              <p className="numeros text-[34px] font-semibold leading-none tracking-tight">{pct(mei.uso)}</p>
              <p className="mt-2 text-sm text-tinta-3">
                {brl(MEI.faturadoNoAno)} de {brl(limite)}
              </p>
            </div>
            <div className="space-y-2">
              <Medidor valor={mei.uso} marca={0.8} rotulo="Uso do teto do MEI" tom={mei.nivel === "ok" ? "azul" : mei.nivel === "alerta" ? "alerta" : "risco"} />
              <div className="flex justify-between text-xs text-tinta-3">
                <span>0%</span>
                <span className="ml-auto mr-[14%]">alerta 80%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-offwhite px-3 py-2.5 text-sm">
              <span className="text-tinta-3">Ainda cabe no ano</span>
              <span className="numeros font-semibold">{brl(mei.restante)}</span>
            </div>
            {mei.nivel !== "ok" ? (
              <Etiqueta tom={mei.nivel === "alerta" ? "alerta" : "risco"} icone={AlertTriangle}>
                {mei.nivel === "alerta" ? "Acima de 80% — planejar migração para ME" : "Limite ultrapassado"}
              </Etiqueta>
            ) : (
              <Etiqueta tom="ok">Dentro do limite</Etiqueta>
            )}
          </div>
        </Cartao>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Cartao className="animate-surgir escala-3 xl:col-span-2">
          <CabecalhoCartao titulo="Próximos passos da semana" descricao="Por sócio, até a mesma data da semana que vem" />
          <div className="grid grid-cols-1 divide-y divide-areia md:grid-cols-3 md:divide-x md:divide-y-0">
            {SOCIOS.map((s) => {
              const meus = passos.filter((p) => p.donoId === s.id);
              return (
                <div key={s.id} className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Avatar nome={s.nome} cor={s.cor} tamanho="sm" />
                    <p className="text-sm font-semibold">{s.nome}</p>
                    <span className="numeros ml-auto text-xs text-tinta-3">{meus.length}</span>
                  </div>
                  {meus.length === 0 ? (
                    <p className="rounded-md border border-dashed border-areia-2 px-3 py-4 text-center text-xs text-tinta-3">Semana livre de pendências.</p>
                  ) : (
                    <ul className="space-y-2">
                      {meus.slice(0, 4).map((p) => {
                        const atrasado = p.proximoPassoData < hoje;
                        return (
                          <li key={p.id}>
                            <Link href={`/leads/${p.id}`} className="block rounded-md border border-areia bg-white px-3 py-2.5 transition hover:border-azul/40 hover:shadow-cartao">
                              <p className="text-[13px] font-medium leading-snug">{p.proximoPasso}</p>
                              <p className="mt-0.5 truncate text-xs text-tinta-3">{p.nome}</p>
                              <p className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium ${atrasado ? "text-risco" : "text-tinta-2"}`}>
                                <CalendarClock aria-hidden className="size-3.5" />
                                {atrasado ? `Atrasado · ${relativo(p.proximoPassoData)}` : `${dataCurta(p.proximoPassoData)} · ${relativo(p.proximoPassoData)}`}
                              </p>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Cartao>

        <Cartao className="animate-surgir escala-4">
          <CabecalhoCartao titulo="Prazos de editais" descricao="Em análise ou aplicando"
            acao={<BotaoLink href="/editais" variante="fantasma" className="min-h-9 px-2 text-azul">Ver todos</BotaoLink>} />
          {editais.length === 0 ? (
            <EstadoVazio icone={TrendingUp} titulo="Nenhum edital aberto" texto="Quando o radar encontrar um edital, ele aparece aqui com o prazo." />
          ) : (
            <ul className="divide-y divide-areia">
              {editais.map((e) => {
                const dias = diasEntre(hoje, e.prazo);
                return (
                  <li key={e.id}>
                    <Link href={`/editais/${e.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-offwhite/70">
                      <div className={`grid w-12 shrink-0 place-items-center rounded-md py-1.5 text-center ${dias <= 7 ? "bg-risco-suave text-risco" : "bg-azul-suave text-azul-escuro"}`}>
                        <span className="numeros text-lg font-semibold leading-none">{dias}</span>
                        <span className="text-[10px] uppercase tracking-wide">dias</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.numero}</p>
                        <p className="truncate text-xs text-tinta-3">{e.objeto}</p>
                        <p className="mt-1 text-xs text-tinta-2">Prazo {dataCurta(e.prazo)} · {brl(e.valor)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  );
}
