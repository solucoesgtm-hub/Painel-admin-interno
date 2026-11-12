"use client";
import { useMemo, useState } from "react";
import { Bot, Cog, History, UserRound } from "lucide-react";
import { Campo, Cartao, Entrada, EstadoVazio, Selecao, cn } from "@/components/ui/base";
import type { EventoHistorico } from "@/lib/demo/dados";
import { data, hora } from "@/lib/formato";

const ACOES: Record<EventoHistorico["acao"], string> = {
  criou: "Criou",
  editou: "Editou",
  excluiu: "Excluiu",
  moveu_etapa: "Moveu de etapa",
  aprovou: "Aprovou",
  recusou: "Recusou",
  executou: "Executou",
};
const COR_ACAO: Partial<Record<EventoHistorico["acao"], string>> = {
  criou: "bg-ok-suave text-ok",
  excluiu: "bg-risco-suave text-risco",
  aprovou: "bg-azul-suave text-azul-escuro",
  recusou: "bg-risco-suave text-risco",
};

export function ListaHistorico({ eventos }: { eventos: EventoHistorico[] }) {
  const [ator, setAtor] = useState("todos");
  const [acao, setAcao] = useState("todas");
  const [busca, setBusca] = useState("");

  const atores = useMemo(() => [...new Set(eventos.map((e) => e.ator.nome))], [eventos]);
  const lista = eventos.filter(
    (e) =>
      (ator === "todos" || e.ator.nome === ator) &&
      (acao === "todas" || e.acao === acao) &&
      (!busca || `${e.descricao} ${e.entidade}`.toLowerCase().includes(busca.toLowerCase())),
  );
  const grupos = lista.reduce<Record<string, EventoHistorico[]>>((g, e) => {
    (g[data(e.em)] ??= []).push(e);
    return g;
  }, {});

  return (
    <Cartao className="animate-surgir">
      <div className="grid grid-cols-1 gap-3 border-b border-areia p-4 sm:grid-cols-3">
        <Campo rotulo="Buscar" id="h-busca"><Entrada id="h-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente, contrato, edital…" /></Campo>
        <Campo rotulo="Quem fez" id="h-ator">
          <Selecao id="h-ator" value={ator} onChange={(e) => setAtor(e.target.value)}>
            <option value="todos">Todos</option>{atores.map((a) => <option key={a}>{a}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Ação" id="h-acao">
          <Selecao id="h-acao" value={acao} onChange={(e) => setAcao(e.target.value)}>
            <option value="todas">Todas</option>{Object.entries(ACOES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Selecao>
        </Campo>
      </div>
      {lista.length === 0 ? (
        <EstadoVazio icone={History} titulo="Nada com esses filtros" texto="Limpe a busca ou escolha outro sócio ou ação." />
      ) : (
        <div className="p-4 sm:p-5">
          {Object.entries(grupos).map(([dia, evs]) => (
            <section key={dia} className="mb-6 last:mb-0">
              <h2 className="numeros mb-3 text-xs font-medium uppercase tracking-[0.14em] text-tinta-3">{dia}</h2>
              <ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-areia">
                {evs.map((e) => {
                  const Icone = e.ator.tipo === "agente" ? Bot : e.ator.tipo === "sistema" ? Cog : UserRound;
                  return (
                    <li key={e.id} className="relative flex gap-3 rounded-md py-2 pr-2">
                      <span className={cn("relative z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-papel", e.ator.tipo === "socio" ? "bg-grafite text-white" : "bg-azul-suave text-azul-escuro")}>
                        <Icone aria-hidden className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <strong className="font-semibold">{e.ator.nome}</strong>{" "}
                          <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", COR_ACAO[e.acao] ?? "bg-neutro-suave text-neutro")}>{ACOES[e.acao]}</span>{" "}
                          <span className="text-tinta-3">{e.entidade}</span>
                        </p>
                        <p className="mt-0.5 text-[13px] text-tinta-2">{e.descricao}</p>
                      </div>
                      <time className="numeros shrink-0 text-xs text-tinta-3" dateTime={e.em}>{hora(e.em)}</time>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </Cartao>
  );
}
