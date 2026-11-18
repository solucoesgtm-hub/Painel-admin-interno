import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FolderKanban, GitBranch, UserRound } from "lucide-react";
import { Avatar, CabecalhoPagina, Cartao, EstadoVazio, Etiqueta, type Tom } from "@/components/ui/base";
import { dataCurta, hojeISO, relativo } from "@/lib/formato";
import { linkRepositorio, NOME_SITUACAO_PROJETO, ordenarProjetos, type SituacaoProjeto } from "@/lib/regras/projetos";
import { listarLeads, listarLembretes, listarProjetos, listarSocios } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { BotaoEditarProjeto, BotaoNovoProjeto } from "./gestao";
import { LembretesProjeto } from "./lembretes";

export const metadata: Metadata = { title: "Projetos" };

const TOM: Record<SituacaoProjeto, Tom> = {
  planejado: "neutro",
  em_andamento: "info",
  em_teste: "alerta",
  entregue: "ok",
  pausado: "risco",
};

export default async function Projetos() {
  const socio = await exigirSocio();
  const hoje = hojeISO();
  const [projetos, socios, leads] = await Promise.all([listarProjetos(), listarSocios(), listarLeads()]);
  const lembretes = await listarLembretes(projetos.map((p) => p.id));
  const ativos = projetos.filter((p) => p.situacao !== "entregue");
  const opcoes = {
    socios: socios.map((s) => ({ id: s.id, nome: s.nome })),
    leads: leads.map((l) => ({ id: l.id, nome: l.nome })),
    socioAtualId: socio.id,
  };

  return (
    <>
      <CabecalhoPagina
        titulo="Projetos"
        descricao={`Um projeto por entrega, ligado a um cliente. ${ativos.length} em aberto. Use os lembretes de cada projeto para marcar o que já foi feito.`}
        acoes={<BotaoNovoProjeto {...opcoes} />}
      />
      {projetos.length === 0 ? (
        <Cartao>
          <EstadoVazio icone={FolderKanban} titulo="Nenhum projeto ainda" texto="Crie o primeiro projeto quando um cliente fechar. Ele aparece aqui com prazo, responsável e lembretes." />
        </Cartao>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ordenarProjetos(projetos).map((p, i) => {
            const dono = socios.find((s) => s.id === p.donoId);
            const atrasado = p.situacao !== "entregue" && p.prazo < hoje;
            const repo = linkRepositorio(p.repositorio);
            return (
              <li key={p.id} className={`animate-surgir escala-${Math.min(i + 1, 5)}`}>
                <Cartao className="flex h-full flex-col p-5 transition hover:border-azul/30 hover:shadow-flutuante">
                  <div className="flex items-start justify-between gap-3">
                    <Etiqueta tom={TOM[p.situacao]}>{NOME_SITUACAO_PROJETO[p.situacao]}</Etiqueta>
                    <div className="-mr-2 -mt-2 flex items-center">
                      {dono && <Avatar nome={dono.nome} cor={dono.cor} tamanho="sm" />}
                      <BotaoEditarProjeto {...opcoes} projeto={p} />
                    </div>
                  </div>
                  <h2 className="mt-1 text-base font-semibold tracking-tight">{p.nome}</h2>
                  <p className="text-sm text-tinta-3">
                    {p.leadId ? (
                      <Link href={`/leads/${p.leadId}`} className="inline-flex items-center gap-1 underline-offset-2 hover:text-azul-escuro hover:underline">
                        <UserRound aria-hidden className="size-3.5" />
                        {p.cliente}
                      </Link>
                    ) : (
                      p.cliente
                    )}
                  </p>
                  {p.descricao && <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-tinta-2">{p.descricao}</p>}
                  <LembretesProjeto
                    projetoId={p.id}
                    projetoNome={p.nome}
                    iniciais={lembretes.filter((l) => l.projetoId === p.id).map(({ id, texto, feito }) => ({ id, texto, feito }))}
                  />
                  <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-areia pt-4 text-xs">
                    <span className={`inline-flex items-center gap-1 ${atrasado ? "font-medium text-risco" : "text-tinta-3"}`}>
                      <CalendarClock aria-hidden className="size-3.5" />
                      {dataCurta(p.prazo)} · {atrasado ? `atrasado ${relativo(p.prazo)}` : relativo(p.prazo)}
                    </span>
                    {repo ? (
                      <a href={repo} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 text-tinta-3 hover:text-azul-escuro hover:underline">
                        <GitBranch aria-hidden className="size-3.5" />
                        {p.repositorio.split("/").pop()}
                      </a>
                    ) : (
                      <span className="text-tinta-3">Sem repositório</span>
                    )}
                  </div>
                </Cartao>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
