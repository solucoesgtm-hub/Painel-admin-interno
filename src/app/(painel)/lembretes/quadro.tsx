"use client";
// Quadro de lembretes e tarefas: resumo, formulário de criação, filtros e um checklist por grupo
// (sem vínculo, por assunto e por projeto). O checklist é o mesmo dos projetos.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import {
  AlarmClock,
  BellRing,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  Inbox,
  ListChecks,
  ListTodo,
  Plus,
  Tag,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Checklist, type AcoesChecklist } from "@/components/checklist";
import { Avatar, Botao, Cartao, EstadoVazio, Medidor, cn } from "@/components/ui/base";
import { BotaoTexto } from "@/components/ui/botao-link";
import { useAviso } from "@/components/ui/toast";
import { paraData } from "@/lib/formato";
import {
  agruparLembretes,
  filtrarLembretes,
  MAX_LEMBRETES,
  MAX_POR_GRUPO,
  MAX_TEXTO_LEMBRETE,
  progressoLembretes,
  resumoLembretes,
  situacaoPrazo,
  type FiltroLembretes,
  type Grupo,
  type Lembrete,
  type TipoLembrete,
} from "@/lib/regras/lembretes";
import { acaoCriarItem, acaoEditarItem, acaoExcluirItem, acaoMarcarItem } from "./acoes";

type SocioMin = { id: string; nome: string; cor: string; foto: string | null };
const dataCurtaBR = (iso: string) => paraData(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

/* ---------------- Botões segmentados (escolha única) ---------------- */
function Segmentos<T extends string>({ rotulo, valor, opcoes, aoMudar }: { rotulo: string; valor: T; opcoes: { v: T; t: string; icone?: LucideIcon }[]; aoMudar: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex rounded-full border border-areia-2 bg-superficie p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={valor === o.v}
          onClick={() => aoMudar(o.v)}
          className={cn(
            "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors",
            valor === o.v ? "bg-azul text-white" : "text-tinta-2 hover:text-tinta",
          )}
        >
          {o.icone && <o.icone aria-hidden className="size-4" />}
          {o.t}
        </button>
      ))}
    </div>
  );
}

export function QuadroLembretes({
  itens,
  projetos,
  socios,
  socioAtualId,
  hoje,
}: {
  itens: Lembrete[];
  projetos: { id: string; nome: string }[];
  socios: SocioMin[];
  socioAtualId: string;
  hoje: string;
}) {
  const [filtro, setFiltro] = useState<FiltroLembretes>({ tipo: "todos", responsavel: "todos", vinculo: "todos" });
  const resumo = resumoLembretes(itens, hoje);
  const grupos = useMemo(() => agruparLembretes(filtrarLembretes(itens, filtro, socioAtualId), projetos, hoje), [itens, filtro, socioAtualId, projetos, hoje]);
  const assuntos = useMemo(() => [...new Set(itens.map((l) => l.assunto).filter((a): a is string => !!a))].sort((a, b) => a.localeCompare(b, "pt-BR")), [itens]);

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo */}
      <ul aria-label="Resumo" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Numero icone={ListChecks} rotulo="Em aberto" valor={resumo.abertos} />
        <Numero icone={ListTodo} rotulo="Tarefas abertas" valor={resumo.tarefas} />
        <Numero icone={TriangleAlert} rotulo="Atrasados" valor={resumo.atrasados} tom={resumo.atrasados ? "risco" : undefined} />
        <Numero icone={AlarmClock} rotulo="Para hoje" valor={resumo.paraHoje} tom={resumo.paraHoje ? "alerta" : undefined} />
        <Numero icone={CheckCircle2} rotulo="Feitos hoje" valor={resumo.feitosHoje} tom={resumo.feitosHoje ? "ok" : undefined} />
      </ul>

      <NovoItem projetos={projetos} socios={socios} socioAtualId={socioAtualId} assuntos={assuntos} />

      {/* Filtros */}
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <span className="text-xs font-medium text-tinta-3">Mostrar</span>
        <div className="sem-rolagem -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <div className="shrink-0">
            <Segmentos rotulo="Tipo" valor={filtro.tipo} aoMudar={(tipo) => setFiltro((f) => ({ ...f, tipo }))} opcoes={[{ v: "todos", t: "Tudo" }, { v: "lembrete", t: "Lembretes" }, { v: "tarefa", t: "Tarefas" }]} />
          </div>
          <div className="shrink-0">
            <Segmentos rotulo="Responsável" valor={filtro.responsavel} aoMudar={(responsavel) => setFiltro((f) => ({ ...f, responsavel }))} opcoes={[{ v: "todos", t: "De todos" }, { v: "meus", t: "Meus" }]} />
          </div>
          <div className="shrink-0">
            <Segmentos
              rotulo="Vínculo"
              valor={filtro.vinculo}
              aoMudar={(vinculo) => setFiltro((f) => ({ ...f, vinculo }))}
              opcoes={[{ v: "todos", t: "Todos" }, { v: "nenhum", t: "Sem vínculo" }, { v: "assunto", t: "Assuntos" }, { v: "projeto", t: "Projetos" }]}
            />
          </div>
        </div>
      </div>

      {grupos.length === 0 ? (
        <Cartao>
          <EstadoVazio
            icone={BellRing}
            titulo={itens.length ? "Nada com esses filtros" : "Nenhum lembrete ainda"}
            texto={itens.length ? "Troque os filtros acima para ver os outros itens." : "Crie o primeiro lembrete ou tarefa no campo acima. Ele pode ficar solto, num assunto ou num projeto."}
          />
        </Cartao>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {grupos.map((g, i) => (
            <li key={g.chave} className={`animate-surgir escala-${Math.min(i + 1, 5)}`}>
              <CartaoGrupo grupo={g} socios={socios} hoje={hoje} filtroChave={`${filtro.tipo}-${filtro.responsavel}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Numero({ icone: Icone, rotulo, valor, tom }: { icone: LucideIcon; rotulo: string; valor: number; tom?: "risco" | "alerta" | "ok" }) {
  const cor = { risco: "bg-risco-suave text-risco", alerta: "bg-alerta-suave text-alerta", ok: "bg-ok-suave text-ok" };
  return (
    <li className="vidro flex items-center gap-3 rounded-xl p-3.5">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", tom ? cor[tom] : "bg-superficie-2 text-tinta-2")}>
        <Icone aria-hidden className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="numeros block text-xl font-semibold leading-tight">{valor}</span>
        <span className="block truncate text-xs text-tinta-3">{rotulo}</span>
      </span>
    </li>
  );
}

/* ---------------- Criar lembrete/tarefa ---------------- */
function NovoItem({ projetos, socios, socioAtualId, assuntos }: { projetos: { id: string; nome: string }[]; socios: SocioMin[]; socioAtualId: string; assuntos: string[] }) {
  const router = useRouter();
  const avisar = useAviso();
  const campo = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<TipoLembrete>("lembrete");
  const [vinculo, setVinculo] = useState<"nenhum" | "projeto" | "assunto">("nenhum");
  const [projetoId, setProjetoId] = useState("");
  const [assunto, setAssunto] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, iniciar] = useTransition();

  const enviar = () =>
    iniciar(async () => {
      setErros({});
      const r = await acaoCriarItem({ texto, tipo, vinculo, projetoId, assunto, responsavelId, prazo });
      if (!r.ok) {
        setErros(r.erros ?? { texto: r.mensagem });
        return;
      }
      avisar({ tom: "ok", texto: tipo === "tarefa" ? "Tarefa criada" : "Lembrete criado" });
      setTexto("");
      router.refresh();
      campo.current?.focus();
    });

  const erro = (c: string) => erros[c] && <p className="mt-1 text-xs text-risco" role="alert">{erros[c]}</p>;
  const estiloCampo = "min-h-11 w-full rounded-md border border-areia-2 bg-superficie px-3 text-base text-tinta sm:text-sm focus:border-azul focus:outline-none focus:ring-3 focus:ring-azul/20";

  return (
    <Cartao className="p-4 sm:p-5">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <label htmlFor="novo-item" className="sr-only">
              {tipo === "tarefa" ? "Nova tarefa" : "Novo lembrete"}
            </label>
            <input
              ref={campo}
              id="novo-item"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={MAX_TEXTO_LEMBRETE}
              placeholder={tipo === "tarefa" ? "O que precisa ser feito?" : "Do que você quer lembrar?"}
              aria-invalid={!!erros.texto}
              className={cn(estiloCampo, "min-h-12 text-[15px]")}
            />
            {erro("texto")}
          </div>
          <div className="shrink-0">
            <Segmentos rotulo="Tipo" valor={tipo} aoMudar={setTipo} opcoes={[{ v: "lembrete", t: "Lembrete", icone: BellRing }, { v: "tarefa", t: "Tarefa", icone: ListTodo }]} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_auto] xl:items-start">
          <div>
            <span className="mb-1 block text-xs font-medium text-tinta-3">Vincular a</span>
            <Segmentos
              rotulo="Vincular a"
              valor={vinculo}
              aoMudar={setVinculo}
              opcoes={[{ v: "nenhum", t: "Nada" }, { v: "projeto", t: "Projeto", icone: FolderKanban }, { v: "assunto", t: "Assunto", icone: Tag }]}
            />
          </div>
          <div>
            {vinculo === "projeto" ? (
              <>
                <label htmlFor="item-projeto" className="mb-1 block text-xs font-medium text-tinta-3">Projeto</label>
                <select id="item-projeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)} className={estiloCampo} aria-invalid={!!erros.projetoId}>
                  <option value="">Escolha o projeto</option>
                  {projetos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
                {erro("projetoId")}
              </>
            ) : vinculo === "assunto" ? (
              <>
                <label htmlFor="item-assunto" className="mb-1 block text-xs font-medium text-tinta-3">Assunto</label>
                <input id="item-assunto" list="assuntos-existentes" value={assunto} onChange={(e) => setAssunto(e.target.value)} maxLength={40} placeholder="Ex.: Financeiro, Marketing, Editais" className={estiloCampo} aria-invalid={!!erros.assunto} />
                <datalist id="assuntos-existentes">
                  {assuntos.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
                {erro("assunto")}
              </>
            ) : (
              <p className="pt-6 text-xs text-tinta-3 max-xl:hidden">Fica em “Sem vínculo”.</p>
            )}
          </div>
          <div>
            <label htmlFor="item-responsavel" className="mb-1 block text-xs font-medium text-tinta-3">Responsável (opcional)</label>
            <select id="item-responsavel" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className={estiloCampo}>
              <option value="">Ninguém em especial</option>
              {socios.map((s) => (
                <option key={s.id} value={s.id}>{s.id === socioAtualId ? `${s.nome} (você)` : s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="item-prazo" className="mb-1 block text-xs font-medium text-tinta-3">Prazo (opcional)</label>
            <input id="item-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={estiloCampo} aria-invalid={!!erros.prazo} />
            {erro("prazo")}
          </div>
          <div className="xl:pt-5">
            <Botao type="submit" icone={Plus} disabled={salvando || texto.trim().length < 2} className="w-full">
              {salvando ? "Salvando…" : "Adicionar"}
            </Botao>
          </div>
        </div>
      </form>
    </Cartao>
  );
}

/* ---------------- Um grupo (sem vínculo, assunto ou projeto) ---------------- */
const ICONE_GRUPO: Record<Grupo["tipo"], LucideIcon> = { nenhum: Inbox, assunto: Tag, projeto: FolderKanban };

function CartaoGrupo({ grupo, socios, hoje, filtroChave }: { grupo: Grupo; socios: SocioMin[]; hoje: string; filtroChave: string }) {
  const [itens, setItens] = useState<{ feito: boolean }[]>(grupo.itens);
  useEffect(() => setItens(grupo.itens), [grupo.itens]);
  const p = progressoLembretes(itens);
  const Icone = ICONE_GRUPO[grupo.tipo];

  const acoes = useMemo<AcoesChecklist>(
    () => ({
      criar: (texto) =>
        acaoCriarItem({ texto, tipo: "lembrete", vinculo: grupo.tipo, projetoId: grupo.projetoId ?? "", assunto: grupo.assunto ?? "" }),
      marcar: (id, feito) => acaoMarcarItem({ id, feito }),
      editar: (id, texto) => acaoEditarItem({ id, texto }),
      excluir: (id) => acaoExcluirItem({ id }),
    }),
    [grupo.tipo, grupo.projetoId, grupo.assunto],
  );

  // Detalhes à direita de cada linha: tarefa, prazo (ícone + texto) e responsável.
  const detalhes = useMemo(() => {
    const d: Record<string, ReactNode> = {};
    for (const l of grupo.itens) {
      const s = situacaoPrazo(l, hoje);
      const resp = socios.find((x) => x.id === l.responsavelId);
      if (l.tipo !== "tarefa" && !l.prazo && !resp) continue;
      d[l.id] = (
        <>
          {l.tipo === "tarefa" && (
            <span className="chk-selo" title="Tarefa">
              <ListTodo aria-hidden className="size-3" />
              <span className="max-sm:sr-only">Tarefa</span>
            </span>
          )}
          {l.prazo && (
            <span
              className={cn("chk-selo numeros", s === "atrasado" && "chk-selo-risco", s === "hoje" && "chk-selo-alerta")}
              title={s === "atrasado" ? "Atrasado" : s === "hoje" ? "Vence hoje" : "Prazo"}
            >
              {s === "atrasado" ? <TriangleAlert aria-hidden className="size-3" /> : <CalendarClock aria-hidden className="size-3" />}
              {s === "hoje" ? "Hoje" : dataCurtaBR(l.prazo)}
              {s === "atrasado" && <span className="sr-only"> (atrasado)</span>}
            </span>
          )}
          {resp && <Avatar nome={resp.nome} cor={resp.cor} foto={resp.foto} tamanho="xs" anel={false} />}
        </>
      );
    }
    return d;
  }, [grupo.itens, socios, hoje]);

  return (
    <Cartao className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", grupo.tipo === "projeto" ? "bg-azul-suave text-azul-escuro" : "bg-superficie-2 text-tinta-2")}>
          <Icone aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold tracking-tight">{grupo.nome}</h2>
          <p className="text-xs text-tinta-3">{grupo.tipo === "projeto" ? "Projeto" : grupo.tipo === "assunto" ? "Assunto" : "Lembretes e tarefas soltos"}</p>
        </div>
        {grupo.tipo === "projeto" && (
          <BotaoTexto href="/projetos" tamanho="mini" variante="secundario" className="-my-2">
            Ver projeto
          </BotaoTexto>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-tinta-3">{p.concluido ? "Tudo feito" : `${p.total - p.feitos} em aberto`}</span>
          <span className="numeros font-medium" aria-live="polite">
            {p.feitos}/{p.total}
          </span>
        </div>
        <Medidor valor={p.fracao} rotulo={`Feitos em ${grupo.nome}`} tom={p.concluido ? "ok" : "azul"} />
      </div>
      <Checklist
        // Remonta só quando o conjunto de itens muda (criar/excluir/filtro), não quando um é marcado:
        // assim a animação do visto e da "queda" não é interrompida pela atualização do servidor.
        key={`${filtroChave}-${grupo.itens.map((l) => l.id).sort().join(",")}`}
        nome={grupo.nome}
        iniciais={grupo.itens.map(({ id, texto, feito }) => ({ id, texto, feito }))}
        acoes={acoes}
        aoMudar={setItens}
        max={grupo.tipo === "projeto" ? MAX_LEMBRETES : MAX_POR_GRUPO}
        detalhes={detalhes}
      />
    </Cartao>
  );
}
