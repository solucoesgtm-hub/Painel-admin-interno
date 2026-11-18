import type { Metadata } from "next";
import { CalendarClock, GitBranch } from "lucide-react";
import { Avatar, CabecalhoPagina, Cartao, Etiqueta, type Tom } from "@/components/ui/base";
import { PROJETOS, socioPorId, type Projeto } from "@/lib/demo/dados";
import { dataCurta, hojeISO, relativo } from "@/lib/formato";
import { listarLembretes } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { LembretesProjeto } from "./lembretes";

export const metadata: Metadata = { title: "Projetos" };

const SITUACAO: Record<Projeto["situacao"], { nome: string; tom: Tom }> = {
  planejado: { nome: "Planejado", tom: "neutro" },
  em_andamento: { nome: "Em andamento", tom: "info" },
  em_teste: { nome: "Em teste", tom: "alerta" },
  entregue: { nome: "Entregue", tom: "ok" },
  pausado: { nome: "Pausado", tom: "risco" },
};

export default async function Projetos() {
  await exigirSocio();
  const hoje = hojeISO();
  const ativos = PROJETOS.filter((p) => p.situacao !== "entregue");
  const lembretes = await listarLembretes(PROJETOS.map((p) => p.id));
  return (
    <>
      <CabecalhoPagina titulo="Projetos"
        descricao={`Um projeto por entrega, ligado a um cliente. ${ativos.length} em aberto. Use os lembretes de cada projeto para marcar o que já foi feito.`} />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PROJETOS.map((p, i) => {
          const dono = socioPorId(p.donoId);
          const atrasado = p.situacao !== "entregue" && p.prazo < hoje;
          return (
            <li key={p.id} className={`animate-surgir escala-${Math.min(i + 1, 5)}`}>
              <Cartao className="flex h-full flex-col p-5 transition hover:border-azul/30 hover:shadow-flutuante">
                <div className="flex items-start justify-between gap-3">
                  <Etiqueta tom={SITUACAO[p.situacao].tom}>{SITUACAO[p.situacao].nome}</Etiqueta>
                  {dono && <Avatar nome={dono.nome} cor={dono.cor} tamanho="sm" />}
                </div>
                <h2 className="mt-3 text-base font-semibold tracking-tight">{p.nome}</h2>
                <p className="text-sm text-tinta-3">{p.cliente}</p>
                <LembretesProjeto
                  projetoId={p.id}
                  projetoNome={p.nome}
                  iniciais={lembretes.filter((l) => l.projetoId === p.id).map(({ id, texto, feito }) => ({ id, texto, feito }))}
                />
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-areia pt-4 text-xs">
                  <span className={`inline-flex items-center gap-1 ${atrasado ? "font-medium text-risco" : "text-tinta-3"}`}>
                    <CalendarClock aria-hidden className="size-3.5" />{dataCurta(p.prazo)} · {atrasado ? `atrasado ${relativo(p.prazo)}` : relativo(p.prazo)}
                  </span>
                  {p.repositorio ? (
                    <span className="inline-flex items-center gap-1 text-tinta-3"><GitBranch aria-hidden className="size-3.5" />{p.repositorio.split("/").pop()}</span>
                  ) : (
                    <span className="text-tinta-3">Sem repositório</span>
                  )}
                </div>
              </Cartao>
            </li>
          );
        })}
      </ul>
    </>
  );
}
