import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Download, Landmark, PiggyBank, Receipt, Scale } from "lucide-react";
import { PainelEntradas } from "@/components/graficos";
import { Contagem } from "@/components/ui/contagem";
import {
  Avatar,
  Aviso,
  BotaoLink,
  CabecalhoCartao,
  CabecalhoPagina,
  Cartao,
  EstadoVazio,
  Etiqueta,
  Medidor,
  Metrica,
  Tabela,
  Td,
  Th,
  Tr,
} from "@/components/ui/base";
import { lerBanco } from "@/lib/conexoes/banco";
import { FATURAMENTO_MESES, MEI, MENSALIDADES } from "@/lib/demo/dados";
import { brl, data, dataHora, hojeISO, pct } from "@/lib/formato";
import {
  categoriaSaida,
  conciliar,
  dividirEntreSocios,
  mensalidadesDoMes,
  serieMensal,
  situacaoMensalidade,
  type LancamentoBanco,
} from "@/lib/regras/financeiro";
import { limiteMei, situacaoMei } from "@/lib/regras/mei";
import { listarContratos, listarSocios } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export const metadata: Metadata = { title: "Financeiro" };

/** Primeiro dia do mês, `meses` meses antes do mês de `hoje`. */
function inicioDoMesAntes(hoje: string, meses: number) {
  const [a, m] = hoje.slice(0, 7).split("-").map(Number) as [number, number];
  return new Date(Date.UTC(a, m - 1 - meses, 1)).toISOString().slice(0, 10);
}

export default async function Financeiro() {
  await exigirSocio();
  const hoje = hojeISO();
  const mesAtual = hoje.slice(0, 7);
  const ano = hoje.slice(0, 4);
  // 12 meses (cobre o gráfico de 12 meses e o faturamento do ano para o MEI).
  const de = inicioDoMesAntes(hoje, 11);

  const [banco, contratos, socios] = await Promise.all([
    lerBanco(de, hoje).catch((e: unknown) => ({ erro: e instanceof Error ? e.message : "Não foi possível ler o banco." })),
    listarContratos(),
    listarSocios(),
  ]);
  const erroBanco = "erro" in banco ? banco.erro : null;
  const real = !("erro" in banco) && banco.tipo === "inter";
  const extrato: LancamentoBanco[] = "erro" in banco ? [] : banco.extrato;
  const saldo = "erro" in banco ? null : banco.saldo;

  // Mensalidades: dos contratos vigentes; sem nenhum, a demonstração mostra as de exemplo.
  const doContrato = mensalidadesDoMes(contratos, hoje);
  const cobrancasBase = doContrato.length || real ? doContrato : MENSALIDADES.filter((m) => m.vencimento.startsWith(mesAtual) || !m.pagoEm);
  const doMes = extrato.filter((l) => l.data.startsWith(mesAtual));
  const { lancamentos, cobrancas } = conciliar(
    doMes.map((l) => (l.tipo === "saida" ? { ...l, categoria: l.categoria ?? categoriaSaida(l.descricao) } : l)),
    cobrancasBase,
  );

  // Números do mês: do extrato quando o Inter está ligado; na demonstração, a série de exemplo.
  const serie = real ? serieMensal(extrato, 12, hoje).map(({ mes, entradas, saidas }) => ({ mes, entradas, saidas })) : FATURAMENTO_MESES;
  const mes = serie.at(-1)!;
  const resultado = mes.entradas - mes.saidas;
  const partes = dividirEntreSocios(Math.max(0, resultado), Math.max(1, socios.length));
  const faturadoNoAno = real
    ? extrato.filter((l) => l.tipo === "entrada" && l.data.startsWith(ano)).reduce((s, l) => s + l.valor, 0)
    : MEI.faturadoNoAno;
  const limite = limiteMei(Number(ano), new Date(`${MEI.abertura}T12:00:00`));
  const mei = situacaoMei(faturadoNoAno, limite);

  const entradas = lancamentos.filter((l) => l.tipo === "entrada");
  const pendentes = entradas.filter((l) => !l.conciliadoCom);
  const porCategoria = Object.entries(
    lancamentos
      .filter((l) => l.tipo === "saida")
      .reduce<Record<string, number>>((a, l) => ({ ...a, [l.categoria ?? "Outros"]: (a[l.categoria ?? "Outros"] ?? 0) + l.valor }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const totalSaidas = porCategoria.reduce((s, [, v]) => s + v, 0);
  const aReceber = cobrancas.filter((c) => situacaoMensalidade(c.vencimento, c.pagoEm, hoje) !== "pago");

  return (
    <>
      <CabecalhoPagina
        titulo="Financeiro"
        descricao="Saldo e extrato do banco (somente leitura), mensalidades com conciliação automática, saídas por categoria e divisão do resultado."
        acoes={
          <BotaoLink href={`/financeiro/planilha?mes=${mesAtual}`} prefetch={false} variante="secundario" icone={Download}>
            Planilha do contador
          </BotaoLink>
        }
      />

      {!real && !erroBanco && (
        <Aviso tom="info" titulo="Banco em demonstração" className="mb-4">
          Saldo e extrato são fictícios. Para ler o Banco Inter (somente leitura), cadastre as chaves e confira em Conexões.
        </Aviso>
      )}
      {erroBanco && (
        <Aviso tom="risco" titulo="Não foi possível ler o banco" className="mb-4">
          {erroBanco} Os números abaixo ficam vazios até a leitura voltar. Confira em Conexões.
        </Aviso>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          destaque
          className="animate-surgir escala-1"
          rotulo="Saldo em conta"
          valor={saldo ? <Contagem valor={saldo.disponivel} formato="brl" /> : "—"}
          icone={Landmark}
          tom="azul"
          detalhe={saldo ? `${real ? "Banco Inter" : "Demonstração"} · ${dataHora(saldo.consultadoEm)}` : "Sem leitura do banco"}
        />
        <Metrica className="animate-surgir escala-2" rotulo="Entradas do mês" valor={<Contagem valor={mes.entradas} formato="brl" />} icone={ArrowDownLeft} tom="ok" detalhe={`${entradas.length} recebimento(s) no extrato`} />
        <Metrica className="animate-surgir escala-3" rotulo="Saídas do mês" valor={<Contagem valor={mes.saidas} formato="brl" />} icone={ArrowUpRight} tom="risco" detalhe={porCategoria[0] ? `Maior gasto: ${porCategoria[0][0]}` : "Sem saídas no extrato"} />
        <Metrica
          className="animate-surgir escala-4"
          rotulo="Resultado do mês"
          valor={<Contagem valor={resultado} formato="brl" />}
          icone={PiggyBank}
          tom={resultado < 0 ? "risco" : "azul"}
          detalhe={mes.entradas > 0 ? `Margem de ${pct(resultado / mes.entradas)}` : "Sem entradas no mês"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Cartao className="animate-surgir escala-2 xl:col-span-2">
          <PainelEntradas dados={serie} />
        </Cartao>
        <Cartao className="animate-surgir escala-3">
          <CabecalhoCartao titulo="Divisão do resultado" descricao={`Partes iguais entre os ${socios.length} sócios`} />
          <ul className="divide-y divide-areia">
            {socios.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <Avatar nome={s.nome} cor={s.cor} />
                <span className="flex-1 text-sm font-medium">{s.nome}</span>
                <span className="numeros font-semibold">{brl(partes[i] ?? 0)}</span>
              </li>
            ))}
          </ul>
          {resultado < 0 && <p className="px-5 pb-3 text-xs text-risco">Resultado negativo no mês: nada a dividir.</p>}
          <div className="border-t border-areia p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 text-tinta-3">
                <Scale aria-hidden className="size-4" />
                Teto do MEI
              </span>
              <span className="numeros font-medium">{pct(mei.uso)}</span>
            </div>
            <div className="mt-2">
              <Medidor valor={mei.uso} marca={0.8} rotulo="Uso do teto do MEI" tom={mei.nivel === "ok" ? "azul" : "alerta"} />
            </div>
            <p className="mt-2 text-xs text-tinta-3">
              {brl(faturadoNoAno)} de {brl(limite)} · alerta em 80%{real ? " · entradas do extrato no ano" : ""}
            </p>
          </div>
        </Cartao>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Cartao className="animate-surgir escala-3">
          <CabecalhoCartao
            titulo="Mensalidades do mês"
            descricao={
              doContrato.length
                ? `${cobrancas.length} dos contratos vigentes · ${brl(aReceber.reduce((s, c) => s + c.valor, 0))} a receber`
                : real
                  ? "Nenhum contrato vigente com mensalidade"
                  : "Exemplo · cadastre contratos vigentes em Contratos"
            }
          />
          {cobrancas.length === 0 ? (
            <EstadoVazio icone={Receipt} titulo="Sem mensalidades" texto="Contratos vigentes com valor mensal aparecem aqui, já conferidos com o extrato." />
          ) : (
            <Tabela rotulo="Mensalidades" className="[&_table]:min-w-[520px]">
              <thead>
                <tr>
                  <Th>Cliente</Th>
                  <Th>Vencimento</Th>
                  <Th>Situação</Th>
                  <Th className="text-right">Valor</Th>
                </tr>
              </thead>
              <tbody>
                {cobrancas.map((m) => {
                  const s = situacaoMensalidade(m.vencimento, m.pagoEm, hoje);
                  return (
                    <Tr key={m.id}>
                      <Td>
                        <p className="text-[13px] font-medium">{m.cliente}</p>
                        <p className="text-xs text-tinta-3">{m.produto}</p>
                      </Td>
                      <Td className="numeros text-[13px]">{data(m.vencimento)}</Td>
                      <Td>
                        <Etiqueta tom={s === "pago" ? "ok" : s === "atrasado" ? "risco" : "alerta"}>
                          {s === "pago" ? `Pago ${m.pagoEm ? data(m.pagoEm).slice(0, 5) : ""}` : s === "atrasado" ? "Atrasado" : "A vencer"}
                        </Etiqueta>
                      </Td>
                      <Td className="numeros text-right">{brl(m.valor)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Tabela>
          )}
        </Cartao>

        <Cartao className="animate-surgir escala-4">
          <CabecalhoCartao
            titulo="Extrato do mês e conciliação"
            descricao={pendentes.length ? `${pendentes.length} entrada(s) sem mensalidade correspondente: confira` : "Todas as entradas conciliadas"}
          />
          {lancamentos.length === 0 ? (
            <EstadoVazio icone={Landmark} titulo="Sem lançamentos no mês" texto="Os lançamentos do banco aparecem aqui assim que o extrato for lido." />
          ) : (
            <ul className="rolagem-fina max-h-[520px] divide-y divide-areia overflow-y-auto">
              {lancamentos.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-md ${e.tipo === "entrada" ? "bg-ok-suave text-ok" : "bg-risco-suave text-risco"}`}>
                    {e.tipo === "entrada" ? <ArrowDownLeft aria-hidden className="size-4" /> : <ArrowUpRight aria-hidden className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{e.descricao}</p>
                    <p className="text-xs text-tinta-3">
                      {data(e.data)} ·{" "}
                      {e.tipo === "saida" ? (
                        e.categoria
                      ) : e.conciliadoCom ? (
                        <span className="inline-flex items-center gap-1 text-ok">
                          <CheckCircle2 aria-hidden className="size-3" />
                          {e.conciliadoCom}
                        </span>
                      ) : (
                        <span className="text-alerta">Sem mensalidade correspondente</span>
                      )}
                    </p>
                  </div>
                  <span className={`numeros shrink-0 text-sm font-semibold ${e.tipo === "entrada" ? "text-ok" : "text-tinta"}`}>
                    {e.tipo === "entrada" ? "+" : "−"}
                    {brl(e.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      <Cartao className="mt-4 animate-surgir escala-5">
        <CabecalhoCartao titulo="Saídas do mês por categoria" descricao={`${brl(totalSaidas)} no total · categorias reconhecidas pela descrição do extrato`} />
        {porCategoria.length === 0 ? (
          <EstadoVazio icone={Receipt} titulo="Sem saídas no mês" texto="Pagamentos que aparecerem no extrato são agrupados aqui." />
        ) : (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {porCategoria.map(([nome, valor]) => (
              <li key={nome}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-tinta-2">
                    <Receipt aria-hidden className="size-3.5 text-tinta-3" />
                    {nome}
                  </span>
                  <span className="numeros font-semibold">{brl(valor)}</span>
                </div>
                <div className="mt-2">
                  <Medidor valor={totalSaidas ? valor / totalSaidas : 0} rotulo={`${nome}: ${pct(totalSaidas ? valor / totalSaidas : 0)} das saídas`} tom="azul" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  );
}
