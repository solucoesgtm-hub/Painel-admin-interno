"use client";
// Mural de ideias: publicar, opinar com marcadores (Gostei, Genial, Pode melhorar, Não curti),
// finalizar/reabrir e excluir. Cada sócio tem um marcador por ideia; o autor não opina na própria.
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Lightbulb, RotateCcw, Send, Sparkles, ThumbsDown, ThumbsUp, Trash2, TrendingUp, type LucideIcon } from "lucide-react";
import { AreaTexto, Avatar, Botao, Cartao, EstadoVazio, Etiqueta, cn } from "@/components/ui/base";
import { BotaoTexto } from "@/components/ui/botao-link";
import { useConfirmar } from "@/components/ui/confirmar";
import { useAviso } from "@/components/ui/toast";
import { relativo } from "@/lib/formato";
import { contarMarcadores, faltamOpinar, MARCADORES, NOME_MARCADOR, ordenarIdeias, type Ideia, type Marcador, type OrdemIdeias } from "@/lib/regras/ideias";
import { acaoCriarIdeia, acaoExcluirIdeia, acaoMarcarIdeia, acaoSituacaoIdeia } from "./acoes";

type SocioMin = { id: string; nome: string; cor: string; foto: string | null };

const ICONE: Record<Marcador, LucideIcon> = { gostei: ThumbsUp, genial: Sparkles, pode_melhorar: TrendingUp, nao_curti: ThumbsDown };
/** Cor do marcador escolhido (fundo suave + texto), sempre com ícone e nome junto. */
const TOM: Record<Marcador, string> = {
  gostei: "bg-azul-suave text-azul-escuro ring-azul/30",
  genial: "bg-ok-suave text-ok ring-ok/30",
  pode_melhorar: "bg-alerta-suave text-alerta ring-alerta/30",
  nao_curti: "bg-risco-suave text-risco ring-risco/30",
};

const quando = (iso: string) => relativo(iso.slice(0, 10));

function Alternar<T extends string>({ rotulo, valor, opcoes, aoMudar }: { rotulo: string; valor: T; opcoes: { v: T; t: string }[]; aoMudar: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex rounded-full border border-areia-2 bg-superficie p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={valor === o.v}
          onClick={() => aoMudar(o.v)}
          className={cn("min-h-10 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors", valor === o.v ? "bg-azul text-white" : "text-tinta-2 hover:text-tinta")}
        >
          {o.t}
        </button>
      ))}
    </div>
  );
}

export function MuralIdeias({ ideias, socios, socioAtualId }: { ideias: Ideia[]; socios: SocioMin[]; socioAtualId: string }) {
  const [filtro, setFiltro] = useState<"aberta" | "finalizada" | "todas">("aberta");
  const [ordem, setOrdem] = useState<OrdemIdeias>("recentes");
  const lista = useMemo(() => ordenarIdeias(filtro === "todas" ? ideias : ideias.filter((i) => i.situacao === filtro), ordem), [ideias, filtro, ordem]);
  const abertas = ideias.filter((i) => i.situacao === "aberta").length;

  return (
    <div className="flex flex-col gap-4">
      <NovaIdeia />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="sem-rolagem -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="shrink-0">
            <Alternar
              rotulo="Mostrar"
              valor={filtro}
              aoMudar={setFiltro}
              opcoes={[
                { v: "aberta", t: `Abertas (${abertas})` },
                { v: "finalizada", t: `Finalizadas (${ideias.length - abertas})` },
                { v: "todas", t: "Todas" },
              ]}
            />
          </div>
          <div className="shrink-0">
            <Alternar rotulo="Ordem" valor={ordem} aoMudar={setOrdem} opcoes={[{ v: "recentes", t: "Recentes" }, { v: "melhores", t: "Mais bem avaliadas" }]} />
          </div>
        </div>
      </div>

      {lista.length === 0 ? (
        <Cartao>
          <EstadoVazio
            icone={Lightbulb}
            titulo={ideias.length ? "Nada neste filtro" : "Nenhuma ideia ainda"}
            texto={ideias.length ? "Troque o filtro acima para ver as outras ideias." : "Publique a primeira ideia no campo acima. Os outros sócios podem dizer o que acharam."}
          />
        </Cartao>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {lista.map((i, n) => (
            <li key={i.id} className={`animate-surgir escala-${Math.min(n + 1, 5)}`}>
              <CartaoIdeia ideia={i} socios={socios} socioAtualId={socioAtualId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NovaIdeia() {
  const router = useRouter();
  const avisar = useAviso();
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, iniciar] = useTransition();
  const publicar = () =>
    iniciar(async () => {
      setErros({});
      const r = await acaoCriarIdeia({ titulo, texto });
      if (!r.ok) return setErros(r.erros ?? { titulo: r.mensagem });
      setTitulo("");
      setTexto("");
      avisar({ tom: "ok", texto: "Ideia publicada no mural" });
      router.refresh();
    });
  const estilo = "w-full rounded-md border border-areia-2 bg-superficie px-3.5 text-base text-tinta sm:text-sm focus:border-azul focus:outline-none focus:ring-3 focus:ring-azul/20";
  return (
    <Cartao className="p-4 sm:p-5">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          publicar();
        }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-alerta-suave text-alerta">
            <Lightbulb aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <label htmlFor="ideia-titulo" className="sr-only">
              Título da ideia
            </label>
            <input
              id="ideia-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={120}
              placeholder="Teve uma ideia? Dê um título a ela"
              aria-invalid={!!erros.titulo}
              className={cn(estilo, "min-h-12 text-[15px] font-medium")}
            />
          </div>
        </div>
        {erros.titulo && (
          <p className="text-xs text-risco" role="alert">
            {erros.titulo}
          </p>
        )}
        <label htmlFor="ideia-texto" className="sr-only">
          Detalhes da ideia
        </label>
        <AreaTexto
          id="ideia-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Explique: qual problema resolve, para quem, como imaginou… (opcional)"
          aria-invalid={!!erros.texto}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="numeros text-xs text-tinta-3">{texto.length}/2000</span>
          <Botao type="submit" icone={Send} disabled={salvando || titulo.trim().length < 3}>
            {salvando ? "Publicando…" : "Publicar ideia"}
          </Botao>
        </div>
      </form>
    </Cartao>
  );
}

function CartaoIdeia({ ideia, socios, socioAtualId }: { ideia: Ideia; socios: SocioMin[]; socioAtualId: string }) {
  const router = useRouter();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const [marcadores, setMarcadores] = useState(ideia.marcadores);
  useEffect(() => setMarcadores(ideia.marcadores), [ideia.marcadores]);
  const [, iniciar] = useTransition();

  const autor = socios.find((s) => s.id === ideia.autorId);
  const minha = ideia.autorId === socioAtualId;
  const finalizada = ideia.situacao === "finalizada";
  const meu = marcadores.find((m) => m.socioId === socioAtualId)?.marcador ?? null;
  const contagem = contarMarcadores(marcadores);
  const faltam = faltamOpinar({ autorId: ideia.autorId, marcadores }, socios.map((s) => s.id)).map((id) => socios.find((s) => s.id === id)?.nome).filter(Boolean);
  const podeOpinar = !minha && !finalizada;

  const marcar = (m: Marcador) => {
    const novo = meu === m ? null : m;
    const antes = marcadores;
    setMarcadores((l) => [...l.filter((x) => x.socioId !== socioAtualId), ...(novo ? [{ socioId: socioAtualId, marcador: novo }] : [])]);
    iniciar(async () => {
      const r = await acaoMarcarIdeia({ ideiaId: ideia.id, marcador: novo });
      if (!r.ok) {
        setMarcadores(antes);
        avisar({ tom: "risco", texto: r.mensagem });
      }
    });
  };

  const situacao = () =>
    iniciar(async () => {
      const r = await acaoSituacaoIdeia({ ideiaId: ideia.id, situacao: finalizada ? "aberta" : "finalizada" });
      if (!r.ok) return avisar({ tom: "risco", texto: r.mensagem });
      avisar({ tom: "ok", texto: finalizada ? "Ideia reaberta" : "Ideia finalizada" });
      router.refresh();
    });

  const excluir = async () => {
    const ok = await confirmar({
      titulo: "Excluir ideia?",
      descricao: (
        <>
          <strong className="font-medium text-tinta">{ideia.titulo}</strong> e as opiniões dos sócios sobre ela serão excluídas. Não dá para desfazer.
        </>
      ),
      rotulo: "Excluir ideia",
      pendente: "Excluindo…",
      acao: async () => {
        const r = await acaoExcluirIdeia(ideia.id);
        if (!r.ok) throw new Error(r.mensagem);
      },
    });
    if (!ok) return;
    avisar({ tom: "ok", texto: "Ideia excluída" });
    router.refresh();
  };

  return (
    <Cartao className={cn("flex flex-col gap-3 p-4 sm:p-5", finalizada && "opacity-90")}>
      <header className="flex items-start gap-3">
        <Avatar nome={autor?.nome ?? "Sócio"} cor={autor?.cor} foto={autor?.foto} tamanho="lg" anel={false} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{autor?.nome ?? "Sócio removido"}{minha && <span className="font-normal text-tinta-3"> (você)</span>}</p>
          <p className="text-xs text-tinta-3">{quando(ideia.criadoEm)}</p>
        </div>
        {finalizada && (
          <Etiqueta tom="ok" icone={CheckCircle2}>
            Finalizada
          </Etiqueta>
        )}
      </header>

      <div>
        <h2 className="text-base font-semibold leading-snug tracking-tight">{ideia.titulo}</h2>
        {ideia.texto && <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-tinta-2">{ideia.texto}</p>}
      </div>

      <div role="group" aria-label={podeOpinar ? "Sua opinião sobre a ideia" : "Opiniões dos sócios"} className="grid grid-cols-2 gap-1.5">
        {MARCADORES.map((m) => {
          const Icone = ICONE[m];
          const ativo = meu === m;
          const quem = marcadores.filter((x) => x.marcador === m).map((x) => socios.find((s) => s.id === x.socioId)?.nome).filter(Boolean);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={podeOpinar ? ativo : undefined}
              disabled={!podeOpinar}
              onClick={() => marcar(m)}
              title={quem.length ? `${NOME_MARCADOR[m]}: ${quem.join(", ")}` : NOME_MARCADOR[m]}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium ring-1 ring-inset transition-colors disabled:cursor-default",
                ativo ? TOM[m] : contagem[m] > 0 ? "bg-superficie-2 text-tinta ring-areia" : "text-tinta-3 ring-areia",
                podeOpinar && !ativo && "hover:bg-superficie-2 hover:text-tinta",
              )}
            >
              <Icone aria-hidden className="size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">{NOME_MARCADOR[m]}</span>
              <span className="numeros text-xs">{contagem[m]}</span>
            </button>
          );
        })}
      </div>

      {marcadores.length > 0 && (
        <ul aria-label="Quem opinou" className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-tinta-3">
          {marcadores.map((x) => {
            const s = socios.find((y) => y.id === x.socioId);
            const Icone = ICONE[x.marcador];
            return (
              <li key={x.socioId} className="inline-flex items-center gap-1.5">
                <Avatar nome={s?.nome ?? "?"} cor={s?.cor} foto={s?.foto} tamanho="xs" anel={false} />
                {s?.nome ?? "Sócio"}
                <Icone aria-hidden className="size-3" />
                <span>{NOME_MARCADOR[x.marcador]}</span>
              </li>
            );
          })}
        </ul>
      )}
      {!finalizada && (
        <p className="text-xs text-tinta-3">
          {minha
            ? faltam.length
              ? `Esperando a opinião de ${faltam.join(" e ")}.`
              : "Todos os sócios já opinaram."
            : meu
              ? "Toque de novo no seu marcador para tirar."
              : "Qual a sua opinião?"}
        </p>
      )}

      <footer className="-mb-2 flex items-center justify-between gap-2 border-t border-areia pt-2">
        <BotaoTexto variante="secundario" iconeInicio={finalizada ? RotateCcw : CheckCircle2} onClick={situacao}>
          {finalizada ? "Reabrir" : "Finalizar"}
        </BotaoTexto>
        <button
          type="button"
          onClick={excluir}
          aria-label={`Excluir a ideia ${ideia.titulo}`}
          title="Excluir ideia"
          className="grid size-11 place-items-center rounded-full text-tinta-3 hover:bg-risco-suave hover:text-risco"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      </footer>
    </Cartao>
  );
}
