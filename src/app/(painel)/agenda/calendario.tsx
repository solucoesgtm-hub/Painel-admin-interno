"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, CalendarX2, ChevronLeft, ChevronRight, ExternalLink, FileSearch, Handshake, MapPin, Trash2, Users } from "lucide-react";
import { AreaTexto, Botao, Campo, Cartao, Entrada, EstadoVazio, Selecao, cn } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";
import { useAviso } from "@/components/ui/toast";
import type { Evento, Socio } from "@/lib/demo/dados";
import { hojeISO, paraData, somarDias } from "@/lib/formato";
import { acaoCriarEvento, acaoExcluirEvento } from "./acoes";

const TIPO = {
  visita: { nome: "Visita", icone: MapPin },
  proximo_passo: { nome: "Próximo passo", icone: Handshake },
  edital: { nome: "Prazo de edital", icone: FileSearch },
  reuniao: { nome: "Reunião", icone: Users },
};

const diaDaSemana = (iso: string) => (paraData(iso).getUTCDay() + 6) % 7; // segunda = 0
const fmtDia = (iso: string, o: Intl.DateTimeFormatOptions) => paraData(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", ...o });

export function Calendario({
  eventos,
  socios,
  socioAtualId,
  google,
}: {
  eventos: Evento[];
  socios: Socio[];
  socioAtualId: string;
  google: boolean;
}) {
  const hoje = hojeISO();
  const router = useRouter();
  const avisar = useAviso();
  const [novo, setNovo] = useState<{ data: string; n: number } | null>(null);
  const [, iniciar] = useTransition();
  const excluir = (e: Evento) => {
    const onde = google ? " Ele também sai do Google Agenda." : "";
    if (!window.confirm(`Excluir “${e.titulo}”?${onde}`)) return;
    iniciar(async () => {
      const r = await acaoExcluirEvento({ id: e.id, titulo: e.titulo });
      if (r.ok) {
        avisar({ tom: "ok", texto: "Evento excluído" });
        router.refresh();
      } else avisar({ tom: "risco", texto: r.mensagem });
    });
  };
  const [visao, setVisao] = useState<"semana" | "mes">("semana");
  const [ref, setRef] = useState(hoje);
  const [filtro, setFiltro] = useState<string[]>(socios.map((s) => s.id));

  const visiveis = eventos.filter((e) => filtro.includes(e.socioId));
  const cor = (id: string) => socios.find((s) => s.id === id)?.cor ?? "#6b6e7a";

  const inicioSemana = somarDias(ref, -diaDaSemana(ref));
  const diasSemana = Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana, i));

  const diasMes = useMemo(() => {
    const primeiro = `${ref.slice(0, 7)}-01`;
    const inicio = somarDias(primeiro, -diaDaSemana(primeiro));
    return Array.from({ length: 42 }, (_, i) => somarDias(inicio, i));
  }, [ref]);

  const navegar = (dir: number) => {
    if (visao === "semana") setRef(somarDias(ref, dir * 7));
    else {
      const d = paraData(`${ref.slice(0, 7)}-15`);
      d.setUTCMonth(d.getUTCMonth() + dir);
      setRef(hojeISO(d));
    }
  };

  const titulo = visao === "semana"
    ? `${fmtDia(diasSemana[0]!, { day: "2-digit", month: "short" })} – ${fmtDia(diasSemana[6]!, { day: "2-digit", month: "short", year: "numeric" })}`
    : fmtDia(ref, { month: "long", year: "numeric" });

  return (
    <Cartao className="animate-surgir overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-areia p-4 lg:flex-row lg:items-center">
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Anterior" onClick={() => navegar(-1)} className="grid size-11 place-items-center rounded-md hover:bg-superficie-2"><ChevronLeft aria-hidden className="size-5" /></button>
          <button type="button" aria-label="Próximo" onClick={() => navegar(1)} className="grid size-11 place-items-center rounded-md hover:bg-superficie-2"><ChevronRight aria-hidden className="size-5" /></button>
          <button type="button" onClick={() => setRef(hoje)} className="min-h-11 rounded-md border border-areia-2 bg-superficie px-3 text-sm hover:border-tinta-3">Hoje</button>
          <h2 className="ml-3 text-lg font-semibold tracking-tight first-letter:uppercase" aria-live="polite">{titulo}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Botao icone={CalendarPlus} onClick={() => setNovo((v) => ({ data: ref, n: (v?.n ?? 0) + 1 }))}>Novo evento</Botao>
          <div role="group" aria-label="Filtrar por sócio" className="flex flex-wrap gap-1.5">
            {socios.map((s) => {
              const on = filtro.includes(s.id);
              return (
                <button key={s.id} type="button" aria-pressed={on}
                  onClick={() => setFiltro(on ? filtro.filter((x) => x !== s.id) : [...filtro, s.id])}
                  className={cn("inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm", on ? "border-areia-2 bg-superficie" : "border-dashed border-areia-2 text-tinta-3 opacity-70")}>
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: on ? s.cor : "transparent", border: `2px solid ${s.cor}` }} />
                  {s.nome}
                </button>
              );
            })}
          </div>
          <div role="group" aria-label="Visualização" className="flex rounded-md border border-areia-2 bg-superficie p-0.5">
            {(["semana", "mes"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={visao === v} onClick={() => setVisao(v)}
                className={cn("min-h-10 rounded-[5px] px-3 text-sm", visao === v ? "bg-azul text-white" : "text-tinta-2")}>
                {v === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visiveis.length === 0 ? (
        <EstadoVazio icone={CalendarX2} titulo="Nenhum sócio selecionado" texto="Ative pelo menos um sócio no filtro para ver os eventos." />
      ) : visao === "semana" ? (
        <ol className="grid grid-cols-1 divide-y divide-areia md:grid-cols-7 md:divide-x md:divide-y-0">
          {diasSemana.map((d) => {
            const doDia = visiveis.filter((e) => e.data === d).sort((a, b) => a.inicio.localeCompare(b.inicio));
            const ehHoje = d === hoje;
            return (
              <li key={d} className={cn("min-h-28 p-2.5 md:min-h-[420px]", ehHoje && "bg-azul-suave/40")}>
                <p className="mb-2 flex items-baseline gap-1.5 px-1">
                  <span className="text-xs uppercase tracking-wide text-tinta-3">{fmtDia(d, { weekday: "short" }).replace(".", "")}</span>
                  <span className={cn("numeros text-lg font-semibold", ehHoje && "grid size-8 place-items-center rounded-full bg-azul text-sm text-white")}>{fmtDia(d, { day: "numeric" })}</span>
                </p>
                <ul className="space-y-1.5">
                  {doDia.map((e) => {
                    const T = TIPO[e.tipo];
                    return (
                      <li key={e.id} className="rounded-md border border-areia bg-superficie p-2 pr-1">
                        <p className="numeros flex items-center gap-1.5 text-[11px] text-tinta-3">
                          <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: cor(e.socioId) }} />
                          {e.fim ? `${e.inicio}–${e.fim}` : e.inicio}
                        </p>
                        <p className="pr-1 text-[12.5px] font-medium leading-snug">{e.titulo}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-tinta-3"><T.icone aria-hidden className="size-3" />{T.nome} · {socios.find((s) => s.id === e.socioId)?.nome ?? "Agenda da GTM"}</p>
                        <span className="mt-1 flex justify-end gap-0.5">
                          {e.link && (
                            <a href={e.link} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${e.titulo} no Google Agenda`} title="Abrir no Google Agenda"
                              className="grid size-9 place-items-center rounded-full text-tinta-3 hover:bg-superficie-2 hover:text-tinta">
                              <ExternalLink aria-hidden className="size-3.5" />
                            </a>
                          )}
                          <button type="button" onClick={() => excluir(e)} aria-label={`Excluir ${e.titulo}`} title="Excluir evento"
                            className="grid size-9 place-items-center rounded-full text-tinta-3 hover:bg-risco-suave hover:text-risco">
                            <Trash2 aria-hidden className="size-3.5" />
                          </button>
                        </span>
                      </li>
                    );
                  })}
                  {doDia.length === 0 && <li className="hidden px-1 text-xs text-tinta-3/70 md:block">—</li>}
                </ul>
              </li>
            );
          })}
        </ol>
      ) : (
        <div>
          <div className="grid grid-cols-7 border-b border-areia bg-superficie-2 text-center text-[11px] uppercase tracking-wide text-tinta-3">
            {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {diasMes.map((d) => {
              const doDia = visiveis.filter((e) => e.data === d);
              const foraDoMes = d.slice(0, 7) !== ref.slice(0, 7);
              return (
                <button key={d} type="button" onClick={() => { setRef(d); setVisao("semana"); }}
                  aria-label={`${fmtDia(d, { day: "numeric", month: "long" })}: ${doDia.length} evento(s)`}
                  className={cn("min-h-16 border-b border-r border-areia/70 p-1.5 text-left align-top hover:bg-superficie-2 sm:min-h-24", foraDoMes && "bg-superficie-2 text-tinta-3/60")}>
                  <span className={cn("numeros text-xs", d === hoje && "inline-grid size-6 place-items-center rounded-full bg-azul font-semibold text-white")}>{fmtDia(d, { day: "numeric" })}</span>
                  <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                    {doDia.slice(0, 3).map((e) => (
                      <span key={e.id} className="truncate rounded px-1 text-[10.5px] text-tinta" style={{ background: `${cor(e.socioId)}2e` }}>{e.titulo}</span>
                    ))}
                    {doDia.length > 3 && <span className="text-[10px] text-tinta-3">+{doDia.length - 3}</span>}
                  </span>
                  {doDia.length > 0 && (
                    <span className="mt-1 flex gap-0.5 sm:hidden">{doDia.slice(0, 3).map((e) => <span key={e.id} className="size-1.5 rounded-full" style={{ background: cor(e.socioId) }} />)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <ModalEvento key={novo?.n ?? -1} aberto={!!novo} dataInicial={novo?.data ?? hoje} socios={socios} socioAtualId={socioAtualId} google={google}
        aoFechar={() => setNovo(null)} aoCriar={(t) => { avisar({ tom: "ok", texto: `Evento criado: ${t}` }); router.refresh(); }} />
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
          <Botao type="button" variante="secundario" onClick={fechar}>Cancelar</Botao>
          <Botao type="submit" form="form-evento" disabled={salvando}>{salvando ? "Criando…" : "Criar evento"}</Botao>
        </>
      }
    >
      <form id="form-evento" onSubmit={(ev) => { ev.preventDefault(); enviar(new FormData(ev.currentTarget)); }} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {mensagem && <p role="alert" className="text-sm text-risco sm:col-span-2">{mensagem}</p>}
        <Campo rotulo="Título" id="ev-titulo" erro={erros.titulo} className="sm:col-span-2">
          <Entrada id="ev-titulo" name="titulo" placeholder="Ex.: Visita — Padaria Pão do Vale" {...err("titulo")} />
        </Campo>
        <Campo rotulo="Tipo" id="ev-tipo">
          <Selecao id="ev-tipo" name="tipo" defaultValue="visita">
            {Object.entries(TIPO).map(([id, t]) => <option key={id} value={id}>{t.nome}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Responsável" id="ev-socioId" erro={erros.socioId}>
          <Selecao id="ev-socioId" name="socioId" defaultValue={socios.some((s) => s.id === socioAtualId) ? socioAtualId : socios[0]?.id} {...err("socioId")}>
            {socios.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
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
