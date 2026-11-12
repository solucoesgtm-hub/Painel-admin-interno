import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, Download, Landmark, Link2, PiggyBank, Receipt, Scale } from "lucide-react";
import { GraficoColunas } from "@/components/graficos";
import {
  Avatar,
  Aviso,
  Botao,
  CabecalhoCartao,
  CabecalhoPagina,
  Cartao,
  Etiqueta,
  Medidor,
  Metrica,
  Tabela,
  Td,
  Th,
  Tr,
} from "@/components/ui/base";
import { CUSTOS_FIXOS, EXTRATO, FATURAMENTO_MESES, MEI, MENSALIDADES, SOCIOS } from "@/lib/demo/dados";
import { brl, data, hojeISO, pct } from "@/lib/formato";
import { dividirEntreSocios, situacaoMensalidade } from "@/lib/regras/financeiro";
import { limiteMei, situacaoMei } from "@/lib/regras/mei";
import { exigirSocio } from "@/lib/sessao";

export const metadata: Metadata = { title: "Financeiro" };

export default async function Financeiro() {
  await exigirSocio();
  const mes = FATURAMENTO_MESES.at(-1)!;
  const resultado = mes.entradas - mes.saidas;
  const partes = dividirEntreSocios(resultado, SOCIOS.length);
  const saldo = 14_382.55;
  const custoFixo = CUSTOS_FIXOS.reduce((a, c) => a + c.valor, 0);
  const ano = Number(hojeISO().slice(0, 4));
  const limite = limiteMei(ano, new Date(`${MEI.abertura}T12:00:00`));
  const mei = situacaoMei(MEI.faturadoNoAno, limite);
  const pendentes = EXTRATO.filter((e) => e.tipo === "entrada" && !e.conciliadoCom);
  const provedor = process.env.PROVEDOR_BANCARIO ?? "demo";

  return (
    <>
      <CabecalhoPagina titulo="Financeiro"
        descricao="Saldo e extrato do banco (somente leitura), mensalidades, conciliação, custos e divisão do resultado."
        acoes={<Botao variante="secundario" icone={Download} disabled title="Disponível na Fase 5">Planilha do contador</Botao>} />

      {provedor === "demo" && (
        <Aviso tom="info" titulo="Provedor bancário de demonstração" className="mb-4">
          A conta no Inter ainda não está aberta. A integração entra na Fase 5, somente leitura (saldo, extrato e Pix recebido), sem pagamentos ou transferências.
        </Aviso>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica destaque className="animate-surgir escala-1" rotulo="Saldo em conta" valor={brl(saldo)} icone={Landmark} tom="azul" detalhe="Atualizado agora · provedor demo" />
        <Metrica className="animate-surgir escala-2" rotulo="Entradas do mês" valor={brl(mes.entradas)} icone={ArrowDownLeft} tom="ok" detalhe={`${EXTRATO.filter((e) => e.tipo === "entrada").length} recebimentos`} />
        <Metrica className="animate-surgir escala-3" rotulo="Saídas do mês" valor={brl(mes.saidas)} icone={ArrowUpRight} tom="risco" detalhe={`Custos fixos: ${brl(custoFixo)}`} />
        <Metrica className="animate-surgir escala-4" rotulo="Resultado do mês" valor={brl(resultado)} icone={PiggyBank} tom="azul" detalhe={`Margem de ${pct(resultado / mes.entradas)}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Cartao className="animate-surgir escala-2 xl:col-span-2">
          <CabecalhoCartao titulo="Entradas e saídas" descricao="Últimos 6 meses, mesma escala" />
          <div className="px-3 pb-4 pt-3 sm:px-5">
            <GraficoColunas dados={FATURAMENTO_MESES} x="mes" series={[{ chave: "entradas", nome: "Entradas" }, { chave: "saidas", nome: "Saídas" }]} formato="brl" altura={280} />
          </div>
        </Cartao>
        <Cartao className="animate-surgir escala-3">
          <CabecalhoCartao titulo="Divisão do resultado" descricao="Partes iguais entre os três sócios" />
          <ul className="divide-y divide-areia">
            {SOCIOS.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar nome={s.nome} cor={s.cor} />
                <span className="flex-1 text-sm font-medium">{s.nome}</span>
                <span className="numeros font-semibold">{brl(partes[i]!)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-areia p-5">
            <div className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-1.5 text-tinta-3"><Scale aria-hidden className="size-4" />Teto do MEI</span><span className="numeros font-medium">{pct(mei.uso)}</span></div>
            <div className="mt-2"><Medidor valor={mei.uso} marca={0.8} rotulo="Uso do teto do MEI" tom={mei.nivel === "ok" ? "azul" : "alerta"} /></div>
            <p className="mt-2 text-xs text-tinta-3">{brl(MEI.faturadoNoAno)} de {brl(limite)} · alerta em 80%</p>
          </div>
        </Cartao>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Cartao className="animate-surgir escala-3">
          <CabecalhoCartao titulo="Mensalidades" descricao="Por cliente e produto" />
          <Tabela rotulo="Mensalidades" className="[&_table]:min-w-[520px]">
            <thead><tr><Th>Cliente</Th><Th>Vencimento</Th><Th>Situação</Th><Th className="text-right">Valor</Th></tr></thead>
            <tbody>
              {MENSALIDADES.map((m) => {
                const s = situacaoMensalidade(m.vencimento, m.pagoEm);
                return (
                  <Tr key={m.id}>
                    <Td><p className="text-[13px] font-medium">{m.cliente}</p><p className="text-xs text-tinta-3">{m.produto}</p></Td>
                    <Td className="numeros text-[13px]">{data(m.vencimento)}</Td>
                    <Td><Etiqueta tom={s === "pago" ? "ok" : s === "atrasado" ? "risco" : "alerta"}>{s === "pago" ? "Pago" : s === "atrasado" ? "Atrasado" : "A vencer"}</Etiqueta></Td>
                    <Td className="numeros text-right">{brl(m.valor)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Tabela>
        </Cartao>

        <Cartao className="animate-surgir escala-4">
          <CabecalhoCartao titulo="Extrato e conciliação" descricao={`${pendentes.length} entrada(s) aguardando conciliação manual`} />
          <ul className="divide-y divide-areia">
            {EXTRATO.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-md ${e.tipo === "entrada" ? "bg-ok-suave text-ok" : "bg-risco-suave text-risco"}`}>
                  {e.tipo === "entrada" ? <ArrowDownLeft aria-hidden className="size-4" /> : <ArrowUpRight aria-hidden className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{e.descricao}</p>
                  <p className="text-xs text-tinta-3">
                    {data(e.data)} · {e.tipo === "saida" ? e.categoria : e.conciliadoCom ? <span className="text-ok">Conciliado: {e.conciliadoCom}</span> : <span className="text-alerta">Não conciliado</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`numeros text-sm font-semibold ${e.tipo === "entrada" ? "text-ok" : "text-tinta"}`}>{e.tipo === "entrada" ? "+" : "−"}{brl(e.valor)}</span>
                  {e.tipo === "entrada" && !e.conciliadoCom && (
                    <button type="button" disabled title="Disponível na Fase 5" className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 text-xs text-azul disabled:opacity-60">
                      <Link2 aria-hidden className="size-3" />Conciliar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Cartao>
      </div>

      <Cartao className="mt-4 animate-surgir escala-5">
        <CabecalhoCartao titulo="Custos fixos" descricao={`${brl(custoFixo)} por mês`} />
        <div className="grid grid-cols-1 divide-y divide-areia sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-5 lg:divide-x">
          {CUSTOS_FIXOS.map((c) => (
            <div key={c.nome} className="p-5">
              <p className="inline-flex items-center gap-1.5 text-xs text-tinta-3"><Receipt aria-hidden className="size-3.5" />{c.categoria}</p>
              <p className="mt-1 text-sm font-medium">{c.nome}</p>
              <p className="numeros mt-1 text-lg font-semibold">{brl(c.valor)}</p>
            </div>
          ))}
        </div>
      </Cartao>
    </>
  );
}
