"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarPlus, CalendarX2, Check, ChevronLeft, ChevronRight, ExternalLink, FileSearch, Handshake, ListTodo, MapPin, Plus, Trash2, Users } from "lucide-react";
import { AreaTexto, Botao, Campo, Cartao, Entrada, EstadoVazio, Selecao, cn } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";
import { useConfirmar } from "@/components/ui/confirmar";
import { useAviso } from "@/components/ui/toast";
import type { Evento, Socio } from "@/lib/demo/dados";
import { hojeISO, paraData, somarDias } from "@/lib/formato";
import { acaoCriarEvento, acaoExcluirEvento } from "./acoes";
import { DetalhesPrazo, SeletorMes, VisaoMes, Popover, type ItemPrazo } from "./mes";
import { acaoMarcarItem } from "../lembretes/acoes";

const TIPO = {
  visita: { nome: "Visita", plural: "visitas", icone: MapPin },
  proximo_passo: { nome: "Próximo passo", plural: "próximos passos", icone: Handshake },
  edital: { nome: "Prazo de edital", plural: "prazos de edital", icone: FileSearch },
  reuniao: { nome: "Reunião", plural: "reuniões", icone: Users },
};

const diaDaSemana = (iso: string) => (paraData(iso).getUTCDay() + 6) % 7; // segunda = 0
const fmtDia = (iso: string, o: Intl.DateTimeFormatOptions) => paraData(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", ...o });

export function Calendario({
  eventos,
  socios,
  socioAtualId,
  google,
  prazos = [],
}: {
  /** Lembretes e tarefas com prazo (aba Lembretes), mostrados no dia do prazo. */
  prazos?: ItemPrazo[];
  eventos: Evento[];
  socios: Socio[];
  socioAtualId: string;
  google: boolean;
}) {
  const hoje = hojeISO();
  const router = useRouter();
  const avisar = useAviso();
  const [novo, setNovo] = useState<{ data: string; n: number } | null>(null);
  const confirmar = useConfirmar();
  const excluir = async (e: Evento) => {
    const ok = await confirmar({
      titulo: "Excluir evento?",
      descricao: (
        <>
          <strong className="font-medium text-tinta">{e.titulo}</strong> ({fmtDia(e.data, { day: "numeric", month: "long" })}
          {e.inicio ? `, ${e.inicio}` : ""}) será excluído{google ? " também do Google Agenda da GTM" : ""}. Não dá para desfazer.
        </>
      ),
      rotulo: "Excluir evento",
      pendente: "Excluindo…",
      acao: async () => {
        const r = await acaoExcluirEvento({ id: e.id, titulo: e.titulo });
        if (!r.ok) throw new Error(r.mensagem);
      },
    });
    if (!ok) return;
    avisar({ tom: "ok", texto: "Evento excluído" });
    router.refresh();
  };
  const [visao, setVisao] = useState<"semana" | "mes">("semana");
  const [ref, setRef] = useState(hoje);
  const [filtro, setFiltro] = useState<string[]>(socios.map((s) => s.id));
  // Dia que pisca depois de "Hoje" ou de escolher um mês.
  const [destaque, setDestaque] = useState<string | null>(null);
  useEffect(() => {
    if (!destaque) return;
    const t = setTimeout(() => setDestaque(null), 1600);
    return () => clearTimeout(t);
  }, [destaque]);

  const visiveis = eventos.filter((e) => filtro.includes(e.socioId));
  // Lembretes/tarefas: aparecem se não têm responsável ou se o responsável está no filtro.
  const [mostrarPrazos, setMostrarPrazos] = useState(true);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  useEffect(() => setMarcados({}), [prazos]);
  const prazosVisiveis = mostrarPrazos
    ? prazos.map((p) => (p.id in marcados ? { ...p, feito: marcados[p.id]! } : p)).filter((p) => !p.responsavelId || filtro.includes(p.responsavelId))
    : [];
  const [prazoAberto, setPrazoAberto] = useState<{ item: ItemPrazo; el: HTMLElement } | null>(null);
  const marcarPrazo = async (p: ItemPrazo) => {
    const feito = !p.feito;
    setMarcados((m) => ({ ...m, [p.id]: feito }));
    const r = await acaoMarcarItem({ id: p.id, feito });
    if (!r.ok) {
      setMarcados((m) => ({ ...m, [p.id]: !feito }));
      return avisar({ tom: "risco", texto: r.mensagem });
    }
    avisar({ tom: "ok", texto: feito ? `${p.tipo === "tarefa" ? "Tarefa" : "Lembrete"} feito` : "Reaberto" });
    router.refresh();
  };
  const cor = (id: string) => socios.find((s) => s.id === id)?.cor ?? "#6b6e7a";

  const inicioSemana = somarDias(ref, -diaDaSemana(ref));
  const diasSemana = Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i));

  const navegar = (dir: number) => {
    if (visao === "semana") setRef(somarDias(ref, dir * 7));
    else {
      const d = paraData(`${ref.slice(0, 7)}-15`);
      d.setUTCMonth(d.getUTCMonth() + dir);
      setRef(`${hojeISO(d).slice(0, 7)}-01`);
    }
  };
  const irHoje = () => {
    setRef(hoje);
    setDestaque(hoje);
  };
  const verSemana = (d: string) => {
    setRef(d);
    setVisao("semana");
  };
  const novoEm = (d: string) => setNovo((v) => ({ data: d, n: (v?.n ?? 0) + 1 }));

  const titulo =
    visao === "semana"
      ? `${fmtDia(diasSemana[0]!, { day: "2-digit", month: "short" })} – ${fmtDia(diasSemana[6]!, { day: "2-digit", month: "short", year: "numeric" })}`
      : fmtDia(`${ref.slice(0, 7)}-15`, { month: "long", year: "numeric" });

  return (
    <Cartao className="animate-surgir overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-areia p-3 sm:p-4">
        {/* Linha 1: navegação à esquerda; visualização e "Novo evento" à direita. Quebra sem sair do cartão. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <button
              type="button"
              aria-label={visao === "semana" ? "Semana anterior" : "Mês anterior"}
              onClick={() => navegar(-1)}
              className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-superficie-2"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              aria-label={visao === "semana" ? "Próxima semana" : "Próximo mês"}
              onClick={() => navegar(1)}
              className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-superficie-2"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
            <button type="button" onClick={irHoje} className="min-h-11 shrink-0 rounded-md border border-areia-2 bg-superficie px-3 text-sm hover:border-tinta-3">
              Hoje
            </button>
            {visao === "semana" ? (
              <h2 className="ml-2 min-w-0 truncate text-base font-semibold tracking-tight first-letter:uppercase sm:text-lg" aria-live="polite">
                {titulo}
              </h2>
            ) : (
              <div className="ml-1 min-w-0">
                <SeletorMes
                  mesRef={ref}
                  aoEscolher={(iso) => {
                    setRef(iso);
                    setDestaque(iso.slice(0, 7) === hoje.slice(0, 7) ? hoje : iso);
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
            <div role="group" aria-label="Visualização" className="flex rounded-full border border-areia-2 bg-superficie p-0.5 max-sm:flex-1">
              {(["semana", "mes"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={visao === v}
                  onClick={() => setVisao(v)}
                  className={cn("min-h-10 rounded-full px-4 text-sm font-medium transition-colors max-sm:flex-1", visao === v ? "bg-azul text-white" : "text-tinta-2 hover:text-tinta")}
                >
                  {v === "semana" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
            <Botao icone={CalendarPlus} onClick={() => novoEm(ref)} className="shrink-0" aria-label="Novo evento">
              <span className="max-sm:sr-only">Novo evento</span>
            </Botao>
          </div>
        </div>
        {/* Linha 2: filtro por sócio. No celular rola para o lado em vez de empilhar. */}
        <div role="group" aria-label="Filtrar por sócio" className="sem-rolagem -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {socios.map((s) => {
            const on = filtro.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => setFiltro(on ? filtro.filter((x) => x !== s.id) : [...filtro, s.id])}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm",
                  on ? "border-areia-2 bg-superficie" : "border-dashed border-areia-2 text-tinta-3 opacity-70",
                )}
              >
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: on ? s.cor : "transparent", border: `2px solid ${s.cor}` }} />
                {s.nome}
              </button>
            );
          })}
          {prazos.length > 0 && (
            <button
              type="button"
              aria-pressed={mostrarPrazos}
              onClick={() => setMostrarPrazos((v) => !v)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-sm",
                mostrarPrazos ? "border-areia-2 bg-superficie" : "border-dashed border-areia-2 text-tinta-3 opacity-70",
              )}
            >
              <ListTodo aria-hidden className="size-4" />
              Lembretes e tarefas
            </button>
          )}
        </div>
      </div>

      {filtro.length === 0 ? (
        <EstadoVazio icone={CalendarX2} titulo="Nenhum sócio selecionado" texto="Ative pelo menos um sócio no filtro para ver os eventos." />
      ) : visao === "semana" ? (
        <ol className="grid grid-cols-1 divide-y divide-areia md:grid-cols-7 md:divide-x md:divide-y-0">
          {diasSemana.map((d) => {
            const doDia = visiveis.filter((e) => e.data === d).sort((a, b) => a.inicio.localeCompare(b.inicio));
            const prazosDoDia = prazosVisiveis.filter((p) => p.prazo === d);
            const ehHoje = d === hoje;
            return (
              <li key={d} className={cn("min-h-28 min-w-0 p-2.5 md:min-h-[420px]", ehHoje && "bg-azul-suave/40", destaque === d && "rd-destaque")}>
                <p className="mb-2 flex items-center gap-1.5 px-1">
                  <span className="text-xs uppercase tracking-wide text-tinta-3">{fmtDia(d, { weekday: "short" }).replace(".", "")}</span>
                  <span className={cn("numeros text-lg font-semibold", ehHoje && "grid size-8 place-items-center rounded-full bg-azul text-sm text-white")}>
                    {fmtDia(d, { day: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => novoEm(d)}
                    aria-label={`Novo evento em ${fmtDia(d, { weekday: "long", day: "numeric", month: "long" })}`}
                    title="Novo evento neste dia"
                    className="ml-auto grid size-9 place-items-center rounded-full text-tinta-3 hover:bg-superficie-2 hover:text-tinta pointer-coarse:size-11"
                  >
                    <Plus aria-hidden className="size-3.5" />
                  </button>
                </p>
                <ul className="space-y-1.5">
                  {prazosDoDia.map((p) => {
                    const Icone = p.tipo === "tarefa" ? ListTodo : BellRing;
                    const atrasado = !p.feito && p.prazo < hoje;
                    return (
                      <li key={`p-${p.id}`} className={cn("flex items-center gap-1 rounded-md border border-dashed p-1 pl-1.5", atrasado ? "border-risco/50" : "border-areia-2", p.feito && "opacity-60")}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={p.feito}
                          aria-label={`${p.feito ? "Reabrir" : "Marcar como feito"}: ${p.texto}`}
                          onClick={() => marcarPrazo(p)}
                          className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-superficie-2 pointer-coarse:size-11"
                        >
                          <span className={cn("grid size-4 place-items-center rounded-[5px] ring-[1.5px] ring-inset", p.feito ? "bg-azul text-white ring-azul" : "ring-areia-2")}>
                            {p.feito && <Check aria-hidden className="size-3" strokeWidth={3} />}
                          </span>
                        </button>
                        <button type="button" onClick={(ev) => setPrazoAberto({ item: p, el: ev.currentTarget })} className="min-w-0 flex-1 py-1 text-left">
                          <span className={cn("block break-words text-[12.5px] font-medium leading-snug", p.feito && "line-through", atrasado && "text-risco")}>{p.texto}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-tinta-3">
                            <Icone aria-hidden className="size-3" />
                            {p.tipo === "tarefa" ? "Tarefa" : "Lembrete"} · {p.grupo}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {doDia.map((e) => {
                    const T = TIPO[e.tipo];
                    return (
                      <li key={e.id} className="rounded-md border border-areia bg-superficie p-2 pr-1">
                        <p className="numeros flex items-center gap-1.5 text-[11px] text-tinta-3">
                          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: cor(e.socioId) }} />
                          {e.fim ? `${e.inicio}–${e.fim}` : e.inicio}
                        </p>
                        <p className="break-words pr-1 text-[12.5px] font-medium leading-snug">{e.titulo}</p>
                        <p className="mt-1 inline-flex flex-wrap items-center gap-1 text-[11px] text-tinta-3">
                          <T.icone aria-hidden className="size-3" />
                          {T.nome} · {socios.find((s) => s.id === e.socioId)?.nome ?? "Agenda da GTM"}
                        </p>
                        <span className="mt-1 flex justify-end gap-0.5">
                          {e.link && (
                            <a
                              href={e.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir ${e.titulo} no Google Agenda`}
                              title="Abrir no Google Agenda"
                              className="grid size-9 place-items-center rounded-full text-tinta-3 hover:bg-superficie-2 hover:text-tinta pointer-coarse:size-11"
                            >
                              <ExternalLink aria-hidden className="size-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => excluir(e)}
                            aria-label={`Excluir ${e.titulo}`}
                            title="Excluir evento"
                            className="grid size-9 place-items-center rounded-full text-tinta-3 hover:bg-risco-suave hover:text-risco pointer-coarse:size-11"
                          >
                            <Trash2 aria-hidden className="size-3.5" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                  {doDia.length === 0 && prazosDoDia.length === 0 && <li className="px-1 text-xs text-tinta-3">Sem eventos</li>}
                </ul>
              </li>
            );
          })}
        </ol>
      ) : (
        <VisaoMes
          refData={ref}
          eventos={visiveis}
          socios={socios}
          tipos={TIPO}
          destaque={destaque}
          aoNavegar={(iso) => {
            setRef(iso);
            setDestaque(iso.slice(0, 7) === hoje.slice(0, 7) ? hoje : iso);
          }}
          aoVerSemana={verSemana}
          aoNovo={novoEm}
          aoExcluir={excluir}
          prazos={prazosVisiveis}
          aoMarcarPrazo={marcarPrazo}
        />
      )}
      {prazoAberto && (
        <Popover ancora={{ el: prazoAberto.el, rect: prazoAberto.el.getBoundingClientRect() }} aoFechar={() => setPrazoAberto(null)} rotulo={`Detalhes: ${prazoAberto.item.texto}`}>
          <DetalhesPrazo
            item={prazoAberto.item}
            socios={socios}
            hoje={hoje}
            aoMarcar={(p) => {
              setPrazoAberto(null);
              void marcarPrazo(p);
            }}
          />
        </Popover>
      )}
      <ModalEvento
        key={novo?.n ?? -1}
        aberto={!!novo}
        dataInicial={novo?.data ?? hoje}
        socios={socios}
        socioAtualId={socioAtualId}
        google={google}
        aoFechar={() => setNovo(null)}
        aoCriar={(t) => {
          avisar({ tom: "ok", texto: `Evento criado: ${t}` });
          router.refresh();
        }}
      />
    </Cartao>
  );
}

function ModalEvento({
  aberto,
  aoFechar,
  aoCriar,
  dataInicial,
  socios,
  socioAtualId,
  google,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoCriar: (titulo: string) => void;
  dataInicial: string;
  socios: Socio[];
  socioAtualId: string;
  google: boolean;
}) {
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [salvando, iniciar] = useTransition();
  const err = (c: string) => (erros[c] ? { "aria-invalid": true, "aria-describedby": `ev-${c}-erro` } : {});
  const fechar = () => {
    setErros({});
    setMensagem("");
    aoFechar();
  };

  function enviar(form: FormData) {
    const dados = Object.fromEntries(form.entries());
    iniciar(async () => {
      const r = await acaoCriarEvento(dados);
      if (r.ok) {
        fechar();
        aoCriar(String(dados.titulo));
      } else {
        setErros(r.erros);
        setMensagem(r.mensagem);
      }
    });
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={fechar}
      titulo="Novo evento"
      descricao={google ? "Vai direto para o Google Agenda da GTM." : "Em demonstração: fica só neste servidor."}
      rodape={
        <>
          <Botao type="button" variante="secundario" onClick={fechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-evento" disabled={salvando}>
            {salvando ? "Criando…" : "Criar evento"}
          </Botao>
        </>
      }
    >
      <form
        id="form-evento"
        onSubmit={(ev) => {
          ev.preventDefault();
          enviar(new FormData(ev.currentTarget));
        }}
        noValidate
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {mensagem && (
          <p role="alert" className="text-sm text-risco sm:col-span-2">
            {mensagem}
          </p>
        )}
        <Campo rotulo="Título" id="ev-titulo" erro={erros.titulo} className="sm:col-span-2">
          <Entrada id="ev-titulo" name="titulo" placeholder="Ex.: Visita — Padaria Pão do Vale" {...err("titulo")} />
        </Campo>
        <Campo rotulo="Tipo" id="ev-tipo">
          <Selecao id="ev-tipo" name="tipo" defaultValue="visita">
            {Object.entries(TIPO).map(([id, t]) => (
              <option key={id} value={id}>
                {t.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Responsável" id="ev-socioId" erro={erros.socioId}>
          <Selecao id="ev-socioId" name="socioId" defaultValue={socios.some((s) => s.id === socioAtualId) ? socioAtualId : socios[0]?.id} {...err("socioId")}>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Data" id="ev-data" erro={erros.data} className="sm:col-span-2">
          <Entrada id="ev-data" name="data" type="date" defaultValue={dataInicial} {...err("data")} />
        </Campo>
        <Campo rotulo="Início" id="ev-inicio" erro={erros.inicio}>
          <Entrada id="ev-inicio" name="inicio" type="time" defaultValue="09:00" {...err("inicio")} />
        </Campo>
        <Campo rotulo="Fim" id="ev-fim" erro={erros.fim}>
          <Entrada id="ev-fim" name="fim" type="time" defaultValue="10:00" {...err("fim")} />
        </Campo>
        <Campo rotulo="Descrição (opcional)" id="ev-descricao" className="sm:col-span-2">
          <AreaTexto id="ev-descricao" name="descricao" rows={2} />
        </Campo>
      </form>
    </Modal>
  );
}
