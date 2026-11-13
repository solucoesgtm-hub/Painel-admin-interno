import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  FileSearch,
  Hourglass,
  Inbox,
  Scale,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PainelEntradas } from "@/components/graficos";
import { Anel } from "@/components/ui/anel";
import { Avatar, CabecalhoCartao, Cartao, LinkIcone, cn, type Tom } from "@/components/ui/base";
import { Contagem } from "@/components/ui/contagem";
import { APROVACOES, EDITAIS, FATURAMENTO_MESES, MEI, MENSALIDADES, PERFIL_GTM } from "@/lib/demo/dados";
import { brl, dataCurta, diasEntre, hojeISO, pct, relativo, somarDias } from "@/lib/formato";
import { situacaoMensalidade } from "@/lib/regras/financeiro";
import { ETAPAS, estaParado, type EtapaId } from "@/lib/regras/funil";
import { limiteMei, situacaoMei } from "@/lib/regras/mei";
import { listarLeads, listarSocios } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

function saudacao() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

type Prioridade = {
  id: string;
  tom: Tom;
  icone: LucideIcon;
  titulo: string;
  detalhe: string;
  href: string;
  acao: string;
};

const COR_ETAPA: Record<EtapaId, string> = {
  lead: "#8b90a6",
  visita: "#7fa2ff",
  proposta: "#3f6fd8",
  fechado: "#1baf7a",
  em_desenvolvimento: "#eda100",
  manutencao: "#137140",
  perdido: "#b3301d",
};

const nomes = (lista: { nome: string }[], max = 2) => {
  const n = lista.slice(0, max).map((l) => l.nome.replace(/\s*\(exemplo\)$/, ""));
  return lista.length > max ? `${n.join(", ")} e mais ${lista.length - max}` : n.join(" e ");
};

export default async function Inicio() {
  const socio = await exigirSocio();
  const [leads, socios] = await Promise.all([listarLeads(), listarSocios()]);
  const hoje = hojeISO();
  const abertos = leads.filter((l) => l.etapa !== "perdido");

  // ---------- Prioridades do dia, da mais urgente para a menos ----------
  const atrasados = abertos.filter((l) => l.proximoPassoData < hoje);
  const paraHoje = abertos.filter((l) => l.proximoPassoData === hoje);
  const parados = leads.filter((l) => estaParado(l.etapa, l.etapaDesde));
  const mensalidadesAtrasadas = MENSALIDADES.filter((m) => situacaoMensalidade(m.vencimento, m.pagoEm) === "atrasado");
  const editaisUrgentes = EDITAIS.filter(
    (e) => ["em_analise", "aplicando"].includes(e.situacao) && diasEntre(hoje, e.prazo) >= 0 && diasEntre(hoje, e.prazo) <= 7,
  );
  const certidoes = PERFIL_GTM.certidoes.filter((c) => diasEntre(hoje, c.validade) <= 15);
  const ano = Number(hoje.slice(0, 4));
  const limite = limiteMei(ano, new Date(`${MEI.abertura}T12:00:00`));
  const mei = situacaoMei(MEI.faturadoNoAno, limite);

  const prioridades: Prioridade[] = [];
  if (atrasados.length)
    prioridades.push({ id: "atrasados", tom: "risco", icone: CalendarX2, href: "/leads",
      titulo: `${atrasados.length} próximo${atrasados.length > 1 ? "s passos atrasados" : " passo atrasado"}`,
      detalhe: nomes(atrasados), acao: "Resolver" });
  if (mensalidadesAtrasadas.length)
    prioridades.push({ id: "mensalidades", tom: "risco", icone: Wallet, href: "/financeiro",
      titulo: `${mensalidadesAtrasadas.length} mensalidade${mensalidadesAtrasadas.length > 1 ? "s" : ""} em atraso`,
      detalhe: `${brl(mensalidadesAtrasadas.reduce((a, m) => a + m.valor, 0))} a receber · ${nomes(mensalidadesAtrasadas.map((m) => ({ nome: m.cliente })))}`,
      acao: "Cobrar" });
  for (const e of editaisUrgentes)
    prioridades.push({ id: `edital-${e.id}`, tom: "alerta", icone: FileSearch, href: `/editais/${e.id}`,
      titulo: `${e.numero} vence ${relativo(e.prazo)}`, detalhe: `${brl(e.valor)} · ${e.orgao}`, acao: "Abrir" });
  for (const c of certidoes) {
    const d = diasEntre(hoje, c.validade);
    prioridades.push({ id: `cert-${c.nome}`, tom: d < 0 ? "risco" : "alerta", icone: BadgeCheck, href: "/editais",
      titulo: d < 0 ? `${c.nome} vencida` : `${c.nome} vence ${relativo(c.validade)}`,
      detalhe: "Renove antes de enviar qualquer edital.", acao: "Ver" });
  }
  if (APROVACOES.length)
    prioridades.push({ id: "aprovacoes", tom: "info", icone: Inbox, href: "/automacao",
      titulo: `${APROVACOES.length} aprovaç${APROVACOES.length > 1 ? "ões" : "ão"} esperando um sócio`,
      detalhe: APROVACOES.slice(0, 2).map((a) => a.titulo.split(" — ")[0]).join(" · "), acao: "Revisar" });
  if (paraHoje.length)
    prioridades.push({ id: "hoje", tom: "info", icone: CalendarClock, href: "/leads",
      titulo: `${paraHoje.length} passo${paraHoje.length > 1 ? "s" : ""} para hoje`, detalhe: nomes(paraHoje), acao: "Ver" });
  if (parados.length)
    prioridades.push({ id: "parados", tom: "alerta", icone: Hourglass, href: "/leads",
      titulo: `${parados.length} lead${parados.length > 1 ? "s parados" : " parado"} há mais de 7 dias`,
      detalhe: nomes(parados), acao: "Destravar" });
  if (mei.nivel !== "ok")
    prioridades.push({ id: "mei", tom: "alerta", icone: Scale, href: "/financeiro",
      titulo: `Teto do MEI em ${pct(mei.uso)}`, detalhe: `Restam ${brl(mei.restante)} no ano. Planeje a migração para ME.`, acao: "Ver" });

  // ---------- Caixa ----------
  const mesAtual = FATURAMENTO_MESES.at(-1)!;
  const mesAnterior = FATURAMENTO_MESES.at(-2)!;
  const variacao = (mesAtual.entradas - mesAnterior.entradas) / mesAnterior.entradas;
  const recorrente = MENSALIDADES.reduce((a, m) => a + m.valor, 0);

  // ---------- Funil ----------
  const etapasFunil = ETAPAS.filter((e) => e.id !== "perdido").map((e) => {
    const nela = leads.filter((l) => l.etapa === e.id);
    return { ...e, total: nela.length, valor: nela.reduce((a, l) => a + l.mensalidade, 0) };
  });
  const totalFunil = etapasFunil.reduce((a, e) => a + e.total, 0);
  const emNegociacao = leads
    .filter((l) => ["visita", "proposta"].includes(l.etapa))
    .reduce((a, l) => a + l.mensalidade, 0);

  // ---------- Semana do sócio ----------
  const fimSemana = somarDias(hoje, 7);
  const minhaSemana = abertos
    .filter((l) => l.donoId === socio.id && l.proximoPassoData <= fimSemana)
    .sort((a, b) => a.proximoPassoData.localeCompare(b.proximoPassoData));
  const equipe = socios.map((s) => ({
    ...s,
    pendentes: abertos.filter((l) => l.donoId === s.id && l.proximoPassoData <= fimSemana).length,
  }));

  const tons: Record<Tom, { fundo: string; icone: string }> = {
    risco: { fundo: "bg-risco-suave", icone: "text-risco" },
    alerta: { fundo: "bg-alerta-suave", icone: "text-alerta" },
    info: { fundo: "bg-azul-suave", icone: "text-azul-escuro" },
    ok: { fundo: "bg-ok-suave", icone: "text-ok" },
    neutro: { fundo: "bg-superficie-2", icone: "text-tinta-2" },
  };

  return (
    <>
      <header className="animate-surgir mb-7">
        <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.035em] text-tinta sm:text-[40px]">
          {saudacao()}, {socio.nome}
        </h1>
        <p className="mt-2 text-[15px] text-tinta-3">
          {prioridades.length === 0
            ? "Nada pendente agora. Bom momento para prospectar."
            : `${prioridades.length} ${prioridades.length > 1 ? "coisas pedem" : "coisa pede"} atenção hoje, da mais urgente para a menos.`}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* ---------- Hoje ---------- */}
        <Cartao className="animate-surgir xl:col-span-2">
          <CabecalhoCartao titulo="Hoje" descricao="Atrasos, prazos e decisões, por ordem de urgência" />
          {prioridades.length === 0 ? (
            <div className="flex items-center gap-4 px-6 py-10">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-ok-suave text-ok">
                <CheckCircle2 aria-hidden className="size-6" />
              </span>
              <div>
                <p className="font-medium">Tudo em dia</p>
                <p className="text-sm text-tinta-3">Sem atrasos, prazos próximos ou aprovações pendentes.</p>
              </div>
            </div>
          ) : (
            <ol className="divide-y divide-areia">
              {prioridades.map((p) => {
                const t = tons[p.tom];
                return (
                  <li key={p.id}>
                    <Link href={p.href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-superficie-2/70 sm:px-6">
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", t.fundo)}>
                        <p.icone aria-hidden className={cn("size-[18px]", t.icone)} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium leading-snug text-tinta">{p.titulo}</span>
                        <span className="mt-0.5 block truncate text-[13px] text-tinta-3">{p.detalhe}</span>
                      </span>
                      <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-azul-escuro sm:inline-flex">
                        {p.acao}
                        <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                      <ArrowRight aria-hidden className="size-4 shrink-0 text-tinta-3 sm:hidden" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </Cartao>

        {/* ---------- Caixa do mês ---------- */}
        <section
          aria-labelledby="caixa-titulo"
          className="animate-surgir escala-1 relative flex flex-col overflow-hidden rounded-xl bg-grafite p-6 xl:self-start text-white shadow-[0_18px_40px_-18px_rgb(18_21_31/0.55)]"
        >
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-azul/40 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <h2 id="caixa-titulo" className="text-base font-semibold">Caixa do mês</h2>
            <LinkIcone href="/financeiro" icone={ArrowUpRight} rotulo="Abrir financeiro"
              className="border-white/10 bg-white/[0.06] text-white hover:border-white/25 hover:bg-white/10 hover:text-white" />
          </div>
          <p className="relative mt-5 text-[36px] font-semibold sm:text-[40px] leading-none tracking-[-0.03em]"><Contagem valor={mesAtual.entradas} formato="brl" /></p>
          <p className="relative mt-2 text-sm text-nevoa">
            entradas ·{" "}
            <span className={variacao >= 0 ? "text-[#5fd39a]" : "text-[#ff8f7a]"}>
              {variacao >= 0 ? "▲" : "▼"} {pct(Math.abs(variacao))}
            </span>{" "}
            vs. mês anterior
          </p>
          <dl className="relative mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-sm">
            <div>
              <dt className="text-nevoa">Recorrente</dt>
              <dd className="numeros mt-0.5 text-lg font-semibold">{brl(recorrente)}</dd>
            </div>
            <div>
              <dt className="text-nevoa">Saídas</dt>
              <dd className="numeros mt-0.5 text-lg font-semibold">{brl(mesAtual.saidas)}</dd>
            </div>
          </dl>
          <div className="relative mt-6 flex items-center gap-5 rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/[0.06]">
            <Anel valor={mei.uso} marca={0.8} claro tamanho={96} espessura={10} rotulo="Uso do teto do MEI"
              corValor={mei.nivel === "ok" ? "#7fa2ff" : "#f2b84b"}>
              <span className="numeros text-lg font-semibold">{pct(mei.uso)}</span>
            </Anel>
            <div className="min-w-0">
              <p className="text-sm font-medium">Teto do MEI</p>
              <p className="mt-1 text-xs leading-relaxed text-nevoa">Restam {brl(mei.restante)} no ano. O ponto branco marca o alerta em 80%.</p>
            </div>
          </div>
        </section>

        {/* ---------- Entradas por período ---------- */}
        <Cartao className="animate-surgir escala-2 xl:col-span-2">
          <PainelEntradas dados={FATURAMENTO_MESES} titulo="Entradas e saídas" />
        </Cartao>

        {/* ---------- Sua semana ---------- */}
        <Cartao className="animate-surgir escala-3 flex flex-col">
          <CabecalhoCartao titulo="Sua semana" descricao="Seus próximos passos até 7 dias" />
          {minhaSemana.length === 0 ? (
            <p className="px-6 py-8 text-sm text-tinta-3">Nenhum passo seu nos próximos 7 dias.</p>
          ) : (
            <ul className="divide-y divide-areia">
              {minhaSemana.slice(0, 5).map((l) => {
                const atrasado = l.proximoPassoData < hoje;
                return (
                  <li key={l.id}>
                    <Link href={`/leads/${l.id}`} className="block px-5 py-3 hover:bg-superficie-2/70 sm:px-6">
                      <span className="block text-sm font-medium leading-snug">{l.proximoPasso}</span>
                      <span className="mt-0.5 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate text-tinta-3">{l.nome}</span>
                        <span className={cn("shrink-0 font-medium", atrasado ? "text-risco" : "text-tinta-2")}>
                          {atrasado ? `atrasado ${relativo(l.proximoPassoData)}` : `${dataCurta(l.proximoPassoData)} · ${relativo(l.proximoPassoData)}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-auto flex items-center gap-4 border-t border-areia px-5 py-3.5 sm:px-6">
            <span className="text-xs text-tinta-3">Equipe na semana</span>
            <ul className="flex flex-wrap gap-3">
              {equipe.map((s) => (
                <li key={s.id} className="inline-flex items-center gap-1.5 text-xs text-tinta-2" title={`${s.nome}: ${s.pendentes} passos na semana`}>
                  <Avatar nome={s.nome} cor={s.cor} tamanho="sm" />
                  <span className="numeros font-medium">{s.pendentes}</span>
                  <span className="sr-only">passos de {s.nome}</span>
                </li>
              ))}
            </ul>
          </div>
        </Cartao>

        {/* ---------- Funil ---------- */}
        <Cartao className="animate-surgir escala-4 xl:col-span-3">
          <CabecalhoCartao
            titulo="Funil"
            descricao={`${totalFunil} ativos · ${brl(emNegociacao)}/mês em negociação`}
            acao={<LinkIcone href="/leads" icone={ArrowUpRight} rotulo="Abrir funil" />}
          />
          <div className="p-5 sm:p-6">
            {totalFunil === 0 ? (
              <p className="py-6 text-center text-sm text-tinta-3">
                Nenhum lead ativo. <Link href="/leads?novo=1" className="font-medium text-azul-escuro underline underline-offset-2">Cadastre o primeiro</Link>.
              </p>
            ) : (
              <>
                <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                  {etapasFunil.filter((e) => e.total).map((e) => (
                    <span key={e.id} style={{ flexGrow: e.total, background: COR_ETAPA[e.id] }} />
                  ))}
                </div>
                <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
                  {etapasFunil.map((e) => (
                    <li key={e.id} className="flex items-start gap-2.5">
                      <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: COR_ETAPA[e.id] }} />
                      <span>
                        <span className="block text-[13px] text-tinta-3">{e.nome}</span>
                        <span className="block text-2xl font-semibold leading-tight"><Contagem valor={e.total} /></span>
                        {e.valor > 0 && <span className="numeros block text-xs text-tinta-3">{brl(e.valor)}/mês</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Cartao>

      </div>

      {(atrasados.length > 0 || parados.length > 0) && (
        <p className="mt-4 flex items-center gap-2 text-xs text-tinta-3">
          <AlertTriangle aria-hidden className="size-3.5" />
          Atrasos e cards parados também aparecem marcados no funil.
        </p>
      )}
    </>
  );
}
