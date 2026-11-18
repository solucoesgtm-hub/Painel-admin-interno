"use client";
// Visão do mês da agenda (inspirada no "Calendar" da BoardUI): seletor de mês, resumo do mês,
// grade com chips de evento que transbordam em "+N mais" e detalhes num popover ancorado.
// No celular, a grade vira um mapa de pontos e o dia tocado lista os eventos logo abaixo.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, CalendarPlus, ChevronDown, ChevronLeft, ChevronRight, Clock, ExternalLink, Plus, Trash2, X, type LucideIcon } from "lucide-react";
import { Avatar, cn } from "@/components/ui/base";
import type { Evento, Socio } from "@/lib/demo/dados";
import { hojeISO, paraData, somarDias } from "@/lib/formato";
import { fotoDoSocio } from "@/lib/regras/avatar";

export type InfoTipo = Record<Evento["tipo"], { nome: string; plural: string; icone: LucideIcon }>;

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => paraData(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", ...o });
const diaDaSemana = (iso: string) => (paraData(iso).getUTCDay() + 6) % 7;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/* ---------------- Popover ancorado ---------------- */
type Ancora = { el: HTMLElement; rect: DOMRect };

export function Popover({ ancora, aoFechar, rotulo, largura = 320, children }: { ancora: Ancora; aoFechar: () => void; rotulo: string; largura?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = ancora.el.isConnected ? ancora.el.getBoundingClientRect() : ancora.rect;
    const w = Math.min(largura, window.innerWidth - 16);
    const h = el.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    const abaixo = r.bottom + 8;
    const top = abaixo + h <= window.innerHeight - 8 ? abaixo : Math.max(8, r.top - h - 8);
    setPos({ left, top });
    el.focus({ preventScroll: true });
  }, [ancora, largura]);

  useEffect(() => {
    const fora = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node) || ancora.el.contains(e.target as Node)) return;
      aoFechar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoFechar();
        ancora.el.focus?.();
      }
    };
    const rolar = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return;
      aoFechar();
    };
    document.addEventListener("pointerdown", fora, true);
    document.addEventListener("keydown", tecla);
    window.addEventListener("scroll", rolar, true);
    window.addEventListener("resize", aoFechar);
    return () => {
      document.removeEventListener("pointerdown", fora, true);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("scroll", rolar, true);
      window.removeEventListener("resize", aoFechar);
    };
  }, [ancora, aoFechar]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={rotulo}
      tabIndex={-1}
      className="vidro-forte animate-entrar-modal fixed z-50 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl p-4 text-tinta outline-none rolagem-fina"
      style={{ width: Math.min(largura, typeof window === "undefined" ? largura : window.innerWidth - 16), left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
    >
      {children}
    </div>
  );
}

/* ---------------- Detalhes de um evento ---------------- */
export function DetalhesEvento({
  evento,
  tipos,
  socios,
  aoExcluir,
  aoVerSemana,
}: {
  evento: Evento;
  tipos: InfoTipo;
  socios: Socio[];
  aoExcluir: (e: Evento) => void;
  aoVerSemana: (data: string) => void;
}) {
  const T = tipos[evento.tipo];
  const dono = socios.find((s) => s.id === evento.socioId);
  const cor = dono?.cor ?? "#6b7280";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-1 h-10 w-1 shrink-0 rounded-full" style={{ background: cor }} />
        <div className="min-w-0">
          <p className="text-base font-semibold leading-snug">{evento.titulo}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-tinta-3">
            <Clock aria-hidden className="size-3.5" />
            <span className="first-letter:uppercase">{fmt(evento.data, { weekday: "long", day: "numeric", month: "long" })}</span>
          </p>
          <p className="numeros text-sm text-tinta-3">{evento.fim ? `${evento.inicio} – ${evento.fim}` : evento.inicio || "Dia inteiro"}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 rounded-xl bg-superficie-2 p-3 text-sm">
        <dt className="text-tinta-3">Tipo</dt>
        <dd className="inline-flex items-center gap-1.5">
          <T.icone aria-hidden className="size-4 text-tinta-2" />
          {T.nome}
        </dd>
        <dt className="text-tinta-3">Responsável</dt>
        <dd className="inline-flex items-center gap-2">
          <Avatar foto={fotoDoSocio(dono)} nome={dono?.nome ?? "Agenda da GTM"} cor={cor} tamanho="sm" />
          {dono?.nome ?? "Agenda da GTM"}
        </dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        {evento.link && (
          <a
            href={evento.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-azul px-4 text-sm font-semibold text-white hover:bg-[#3461c9]"
          >
            <ExternalLink aria-hidden className="size-4" />
            Abrir no Google Agenda
          </a>
        )}
        <button
          type="button"
          onClick={() => aoVerSemana(evento.data)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-areia-2 px-4 text-sm font-medium hover:bg-superficie-2"
        >
          <CalendarDays aria-hidden className="size-4" />
          Ver semana
        </button>
        <button
          type="button"
          onClick={() => aoExcluir(evento)}
          aria-label={`Excluir ${evento.titulo}`}
          title="Excluir evento"
          className="grid size-11 place-items-center rounded-full text-tinta-3 hover:bg-risco-suave hover:text-risco"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Seletor de mês ---------------- */
export function SeletorMes({ mesRef: refMes, aoEscolher }: { mesRef: string; aoEscolher: (iso: string) => void }) {
  const [aberto, setAberto] = useState<Ancora | null>(null);
  const [ano, setAno] = useState(Number(refMes.slice(0, 4)));
  const atual = refMes.slice(0, 7);
  const hoje = hojeISO().slice(0, 7);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={!!aberto}
        onClick={(e) => {
          setAno(Number(refMes.slice(0, 4)));
          setAberto(aberto ? null : { el: e.currentTarget, rect: e.currentTarget.getBoundingClientRect() });
        }}
        className="inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl px-2 text-left text-lg font-semibold tracking-tight hover:bg-superficie-2"
      >
        <span className="truncate first-letter:uppercase" aria-live="polite">
          {fmt(`${atual}-15`, { month: "long", year: "numeric" })}
        </span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-tinta-3" />
      </button>
      {aberto && (
        <Popover ancora={aberto} aoFechar={() => setAberto(null)} rotulo="Escolher mês" largura={300}>
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Ano anterior" onClick={() => setAno((a) => a - 1)} className="grid size-11 place-items-center rounded-full hover:bg-superficie-2">
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <span className="numeros text-base font-semibold">{ano}</span>
            <button type="button" aria-label="Próximo ano" onClick={() => setAno((a) => a + 1)} className="grid size-11 place-items-center rounded-full hover:bg-superficie-2">
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {MESES.map((m, i) => {
              const chave = `${ano}-${String(i + 1).padStart(2, "0")}`;
              return (
                <button
                  key={m}
                  type="button"
                  aria-current={chave === atual ? "date" : undefined}
                  onClick={() => {
                    setAberto(null);
                    aoEscolher(`${chave}-01`);
                  }}
                  className={cn(
                    "min-h-11 rounded-xl text-sm font-medium capitalize",
                    chave === atual ? "bg-azul text-white" : chave === hoje ? "text-azul-escuro ring-1 ring-inset ring-azul/40 hover:bg-superficie-2" : "hover:bg-superficie-2",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </Popover>
      )}
    </>
  );
}

/* ---------------- Grade do mês ---------------- */
type Aberto = { tipo: "evento"; evento: Evento; ancora: Ancora } | { tipo: "dia"; dia: string; ancora: Ancora };

export function VisaoMes({
  refData,
  eventos,
  socios,
  tipos,
  destaque,
  aoNavegar,
  aoVerSemana,
  aoNovo,
  aoExcluir,
}: {
  refData: string;
  eventos: Evento[];
  socios: Socio[];
  tipos: InfoTipo;
  destaque: string | null;
  aoNavegar: (iso: string, destacar?: boolean) => void;
  aoVerSemana: (data: string) => void;
  aoNovo: (data: string) => void;
  aoExcluir: (e: Evento) => void;
}) {
  const hoje = hojeISO();
  const mes = refData.slice(0, 7);
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const [selecionado, setSelecionado] = useState<string>(refData.slice(0, 7) === hoje.slice(0, 7) ? hoje : `${mes}-01`);
  useEffect(() => setSelecionado(refData.slice(0, 7) === hoje.slice(0, 7) ? hoje : refData), [refData, hoje]);

  // Só as semanas que tocam o mês (5 ou 6 linhas).
  const dias = useMemo(() => {
    const primeiro = `${mes}-01`;
    const inicio = somarDias(primeiro, -diaDaSemana(primeiro));
    const lista: string[] = [];
    for (let d = inicio; lista.length < 42; d = somarDias(d, 1)) {
      if (lista.length % 7 === 0 && lista.length > 0 && d.slice(0, 7) > mes) break;
      lista.push(d);
    }
    return lista;
  }, [mes]);

  const porDia = useMemo(() => {
    const m = new Map<string, Evento[]>();
    for (const e of eventos) m.set(e.data, [...(m.get(e.data) ?? []), e]);
    for (const l of m.values()) l.sort((a, b) => (a.inicio || "00:00").localeCompare(b.inicio || "00:00"));
    return m;
  }, [eventos]);

  const doMes = eventos.filter((e) => e.data.startsWith(mes));
  const cor = (id: string) => socios.find((s) => s.id === id)?.cor ?? "#6b7280";
  type SemAncora = { tipo: "evento"; evento: Evento } | { tipo: "dia"; dia: string };
  const abrir = (a: SemAncora, el: HTMLElement) => setAberto({ ...a, ancora: { el, rect: el.getBoundingClientRect() } } as Aberto);
  const fechar = () => setAberto(null);
  const doSelecionado = porDia.get(selecionado) ?? [];

  const chip = (e: Evento) => (
    <button
      key={e.id}
      type="button"
      onClick={(ev) => {
        ev.stopPropagation();
        abrir({ tipo: "evento", evento: e }, ev.currentTarget);
      }}
      className="flex w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[11.5px] leading-[18px] text-tinta transition-colors hover:brightness-110 focus-visible:outline-2"
      style={{ background: `color-mix(in srgb, ${cor(e.socioId)} 16%, transparent)` }}
      title={`${e.inicio ? `${e.inicio} · ` : ""}${e.titulo}`}
    >
      <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full" style={{ background: cor(e.socioId) }} />
      {e.inicio && <span className="numeros shrink-0 text-tinta-3">{e.inicio}</span>}
      <span className="truncate font-medium">{e.titulo}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      {/* Cabeçalho do mês + resumo */}
      <div>
        <ul aria-label="Resumo do mês" className="flex flex-wrap gap-1.5 text-xs">
          <li className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-azul-suave px-3 font-semibold text-azul-escuro">
            <span className="numeros">{doMes.length}</span> evento{doMes.length === 1 ? "" : "s"} no mês
          </li>
          {(Object.keys(tipos) as Evento["tipo"][]).map((t) => {
            const n = doMes.filter((e) => e.tipo === t).length;
            if (!n) return null;
            const T = tipos[t];
            return (
              <li key={t} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-superficie-2 px-3 text-tinta-2">
                <T.icone aria-hidden className="size-3.5" />
                <span className="numeros font-semibold text-tinta">{n}</span> {n === 1 ? T.nome.toLowerCase() : T.plural}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Grade */}
      <div className="overflow-hidden rounded-2xl ring-1 ring-inset ring-areia sm:rounded-3xl">
        <div className="grid grid-cols-7 border-b border-areia bg-superficie-2 text-center text-[11px] font-medium uppercase tracking-wide text-tinta-3">
          {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d, i) => {
            const lista = porDia.get(d) ?? [];
            const fora = d.slice(0, 7) !== mes;
            const ehHoje = d === hoje;
            const nome = fmt(d, { weekday: "long", day: "numeric", month: "long" });
            const visiveis = lista.slice(0, 3);
            const resto = lista.length - visiveis.length;
            return (
              <div
                key={d}
                className={cn(
                  "group relative min-h-[60px] border-areia/80 sm:min-h-[118px]",
                  i % 7 !== 6 && "border-r",
                  i < dias.length - 7 && "border-b",
                  fora && "bg-superficie-2/60",
                  selecionado === d && "max-sm:bg-azul-suave",
                  destaque === d && "rd-destaque",
                )}
              >
                {/* Celular: o dia inteiro é o alvo e seleciona o dia */}
                <button
                  type="button"
                  onClick={() => setSelecionado(d)}
                  aria-label={`${nome}: ${lista.length} evento(s)`}
                  aria-pressed={selecionado === d}
                  className="absolute inset-0 sm:hidden"
                />
                <div className="pointer-events-none relative flex items-center justify-between p-1 sm:pointer-events-auto sm:p-1.5">
                  <button
                    type="button"
                    onClick={() => aoVerSemana(d)}
                    aria-label={`Ver a semana de ${nome}`}
                    title="Ver a semana"
                    className={cn(
                      "numeros grid size-7 place-items-center rounded-full text-xs font-medium hover:bg-superficie-2 max-sm:mx-auto",
                      fora && "text-tinta-3/60",
                      ehHoje && "bg-azul font-semibold text-white hover:bg-azul",
                    )}
                  >
                    {fmt(d, { day: "numeric" })}
                  </button>
                  <button
                    type="button"
                    onClick={() => aoNovo(d)}
                    aria-label={`Novo evento em ${nome}`}
                    title="Novo evento neste dia"
                    className="hidden size-7 place-items-center rounded-full text-tinta-3 opacity-0 transition-opacity hover:bg-superficie-2 hover:text-tinta focus-visible:opacity-100 group-hover:opacity-100 sm:grid"
                  >
                    <Plus aria-hidden className="size-3.5" />
                  </button>
                </div>
                {/* Computador: chips + "+N mais" */}
                <div className="hidden flex-col gap-0.5 px-1 pb-1.5 sm:flex">
                  {visiveis.map(chip)}
                  {resto > 0 && (
                    <button
                      type="button"
                      onClick={(ev) => abrir({ tipo: "dia", dia: d }, ev.currentTarget)}
                      className="min-h-6 rounded-md px-1.5 text-left text-[11px] font-medium text-tinta-3 hover:bg-superficie-2 hover:text-tinta"
                    >
                      +{resto} mais
                    </button>
                  )}
                </div>
                {/* Celular: pontos */}
                {lista.length > 0 && (
                  <span className="pointer-events-none relative mx-auto flex justify-center gap-0.5 pb-1.5 sm:hidden" aria-hidden>
                    {lista.slice(0, 3).map((e) => (
                      <span key={e.id} className="size-1.5 rounded-full" style={{ background: cor(e.socioId) }} />
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Celular: lista do dia tocado */}
      <section aria-label="Eventos do dia escolhido" className="sm:hidden">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold first-letter:uppercase">{fmt(selecionado, { weekday: "long", day: "numeric", month: "long" })}</h3>
          <button type="button" onClick={() => aoNovo(selecionado)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-azul-escuro hover:bg-superficie-2">
            <CalendarPlus aria-hidden className="size-4" />
            Novo
          </button>
        </div>
        {doSelecionado.length === 0 ? (
          <p className="rounded-xl bg-superficie-2 px-3 py-4 text-sm text-tinta-3">Nenhum evento neste dia.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {doSelecionado.map((e) => {
              const T = tipos[e.tipo];
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={(ev) => abrir({ tipo: "evento", evento: e }, ev.currentTarget)}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
                    style={{ background: `color-mix(in srgb, ${cor(e.socioId)} 12%, transparent)` }}
                  >
                    <span aria-hidden className="h-8 w-1 shrink-0 rounded-full" style={{ background: cor(e.socioId) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{e.titulo}</span>
                      <span className="numeros flex items-center gap-1 text-xs text-tinta-3">
                        {e.fim ? `${e.inicio} – ${e.fim}` : e.inicio || "Dia inteiro"} · <T.icone aria-hidden className="size-3" /> {T.nome}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {aberto?.tipo === "evento" && (
        <Popover ancora={aberto.ancora} aoFechar={fechar} rotulo={`Detalhes: ${aberto.evento.titulo}`}>
          <DetalhesEvento
            evento={aberto.evento}
            tipos={tipos}
            socios={socios}
            aoExcluir={(e) => {
              fechar();
              aoExcluir(e);
            }}
            aoVerSemana={(d) => {
              fechar();
              aoVerSemana(d);
            }}
          />
        </Popover>
      )}
      {aberto?.tipo === "dia" && (
        <Popover ancora={aberto.ancora} aoFechar={fechar} rotulo={`Eventos de ${fmt(aberto.dia, { day: "numeric", month: "long" })}`} largura={300}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold first-letter:uppercase">{fmt(aberto.dia, { weekday: "long", day: "numeric", month: "long" })}</p>
            <button type="button" onClick={fechar} aria-label="Fechar" className="grid size-9 place-items-center rounded-full text-tinta-3 hover:bg-superficie-2">
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {(porDia.get(aberto.dia) ?? []).map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setAberto({ tipo: "evento", evento: e, ancora: aberto.ancora })}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-sm hover:bg-superficie-2"
              >
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: cor(e.socioId) }} />
                <span className="numeros w-11 shrink-0 text-xs text-tinta-3">{e.inicio || "—"}</span>
                <span className="truncate font-medium">{e.titulo}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const d = aberto.dia;
              fechar();
              aoNovo(d);
            }}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-areia-2 text-sm font-medium hover:bg-superficie-2"
          >
            <CalendarPlus aria-hidden className="size-4" />
            Novo evento neste dia
          </button>
        </Popover>
      )}
    </div>
  );
}
