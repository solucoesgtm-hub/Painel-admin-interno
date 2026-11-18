"use client";
// Progresso + checklist de lembretes de um projeto. O medidor acompanha cada marcação na hora.
import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, ListChecks } from "lucide-react";
import { Checklist, type AcoesChecklist } from "@/components/checklist";
import { acaoCriarLembrete, acaoEditarLembrete, acaoExcluirLembrete, acaoMarcarLembrete } from "./acoes";
import { Medidor } from "@/components/ui/base";
import { progressoLembretes, type Lembrete } from "@/lib/regras/lembretes";

type Item = Pick<Lembrete, "id" | "texto" | "feito">;

export function LembretesProjeto({ projetoId, projetoNome, iniciais }: { projetoId: string; projetoNome: string; iniciais: Item[] }) {
  const [itens, setItens] = useState(iniciais);
  const aoMudar = useCallback((n: Item[]) => setItens(n), []);
  const p = progressoLembretes(itens);
  const acoes = useMemo<AcoesChecklist>(
    () => ({
      criar: (texto) => acaoCriarLembrete({ projetoId, texto }),
      marcar: (id, feito) => acaoMarcarLembrete({ id, projetoId, feito }),
      editar: (id, texto) => acaoEditarLembrete({ id, projetoId, texto }),
      excluir: (id) => acaoExcluirLembrete({ id, projetoId }),
    }),
    [projetoId],
  );
  return (
    <div className="mb-5 mt-5 space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-tinta-3">
            {p.concluido ? <CheckCircle2 aria-hidden className="size-3.5 text-ok" /> : <ListChecks aria-hidden className="size-3.5" />}
            {p.total === 0 ? "Nenhum lembrete ainda" : p.concluido ? "Tudo feito" : "Lembretes"}
          </span>
          <span className="numeros font-medium" aria-live="polite">
            {p.feitos}/{p.total}
          </span>
        </div>
        <Medidor valor={p.fracao} rotulo={`Lembretes feitos em ${projetoNome}`} tom={p.concluido ? "ok" : "azul"} />
      </div>
      <Checklist nome={projetoNome} iniciais={iniciais} acoes={acoes} aoMudar={aoMudar} />
    </div>
  );
}
