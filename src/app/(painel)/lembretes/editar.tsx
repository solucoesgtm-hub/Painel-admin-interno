"use client";
// Edição completa de um lembrete/tarefa: texto, tipo, vínculo (nada, projeto ou assunto),
// responsável e prazo. Abre pelo botão "Prazo, responsável e vínculo" no modo de edição da linha.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BellRing, FolderKanban, ListTodo, Tag, Trash2 } from "lucide-react";
import { Botao, Campo, Entrada, Selecao, cn } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";
import { Modal } from "@/components/ui/modal";
import { useAviso } from "@/components/ui/toast";
import { MAX_TEXTO_LEMBRETE, type Lembrete, type TipoLembrete } from "@/lib/regras/lembretes";
import { acaoAtualizarItem, acaoExcluirItem } from "./acoes";

type Vinculo = "nenhum" | "projeto" | "assunto";

function Escolha<T extends string>({ rotulo, valor, opcoes, aoMudar }: { rotulo: string; valor: T; opcoes: { v: T; t: string; icone: typeof Tag }[]; aoMudar: (v: T) => void }) {
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
            "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
            valor === o.v ? "bg-azul text-white" : "text-tinta-2 hover:text-tinta",
          )}
        >
          <o.icone aria-hidden className="size-4" />
          {o.t}
        </button>
      ))}
    </div>
  );
}

export function ModalEditarItem({
  item,
  projetos,
  socios,
  assuntos,
  socioAtualId,
  aoFechar,
}: {
  item: Lembrete;
  projetos: { id: string; nome: string }[];
  socios: { id: string; nome: string }[];
  assuntos: string[];
  socioAtualId: string;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const [texto, setTexto] = useState(item.texto);
  const [tipo, setTipo] = useState<TipoLembrete>(item.tipo);
  const [vinculo, setVinculo] = useState<Vinculo>(item.projetoId ? "projeto" : item.assunto ? "assunto" : "nenhum");
  const [projetoId, setProjetoId] = useState(item.projetoId ?? "");
  const [assunto, setAssunto] = useState(item.assunto ?? "");
  const [responsavelId, setResponsavelId] = useState(item.responsavelId ?? "");
  const [prazo, setPrazo] = useState(item.prazo ?? "");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [salvando, iniciar] = useTransition();
  // Projeto já entregue some da lista de criação, mas continua escolhível se for o atual.
  const listaProjetos = item.projetoId && !projetos.some((p) => p.id === item.projetoId) ? [...projetos, { id: item.projetoId, nome: "Projeto atual" }] : projetos;

  const salvar = () =>
    iniciar(async () => {
      setErros({});
      setMensagem("");
      const r = await acaoAtualizarItem(item.id, { texto, tipo, vinculo, projetoId, assunto, responsavelId, prazo });
      if (!r.ok) {
        setErros(r.erros ?? {});
        setMensagem(r.mensagem);
        return;
      }
      avisar({ tom: "ok", texto: tipo === "tarefa" ? "Tarefa atualizada" : "Lembrete atualizado" });
      aoFechar();
      router.refresh();
    });

  const excluir = async () => {
    const ok = await confirmar({
      titulo: tipo === "tarefa" ? "Excluir tarefa?" : "Excluir lembrete?",
      descricao: (
        <>
          <strong className="font-medium text-tinta">{item.texto}</strong> será excluído para todos os sócios. Não dá para desfazer.
        </>
      ),
      rotulo: tipo === "tarefa" ? "Excluir tarefa" : "Excluir lembrete",
      pendente: "Excluindo…",
      acao: async () => {
        const r = await acaoExcluirItem({ id: item.id });
        if (!r.ok) throw new Error(r.mensagem);
      },
    });
    if (!ok) return;
    avisar({ tom: "ok", texto: "Excluído" });
    aoFechar();
    router.refresh();
  };

  const err = (c: string) => (erros[c] ? { "aria-invalid": true as const } : {});

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={tipo === "tarefa" ? "Editar tarefa" : "Editar lembrete"}
      descricao={item.feito ? "Este item já está marcado como feito." : "Troque o texto, o vínculo, o responsável ou o prazo."}
      rodape={
        <>
          <Botao type="button" variante="fantasma" icone={Trash2} onClick={excluir} disabled={salvando} className="mr-auto text-risco hover:bg-risco-suave hover:text-risco">
            Excluir
          </Botao>
          <Botao type="button" variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-editar-item" disabled={salvando || texto.trim().length < 2}>
            {salvando ? "Salvando…" : "Salvar"}
          </Botao>
        </>
      }
    >
      <form
        id="form-editar-item"
        noValidate
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        {mensagem && (
          <p role="alert" className="text-sm text-risco sm:col-span-2">
            {mensagem}
          </p>
        )}
        <Campo rotulo="Texto" id="ei-texto" erro={erros.texto} className="sm:col-span-2">
          <Entrada id="ei-texto" value={texto} maxLength={MAX_TEXTO_LEMBRETE} onChange={(e) => setTexto(e.target.value)} {...err("texto")} />
        </Campo>
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-medium text-tinta-2">Tipo</span>
          <Escolha rotulo="Tipo" valor={tipo} aoMudar={setTipo} opcoes={[{ v: "lembrete", t: "Lembrete", icone: BellRing }, { v: "tarefa", t: "Tarefa", icone: ListTodo }]} />
        </div>
        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-[13px] font-medium text-tinta-2">Vincular a</span>
          <Escolha
            rotulo="Vincular a"
            valor={vinculo}
            aoMudar={setVinculo}
            opcoes={[
              { v: "nenhum", t: "Nada", icone: BellRing },
              { v: "projeto", t: "Projeto", icone: FolderKanban },
              { v: "assunto", t: "Assunto", icone: Tag },
            ]}
          />
        </div>
        {vinculo === "projeto" && (
          <Campo rotulo="Projeto" id="ei-projeto" erro={erros.projetoId} className="sm:col-span-2">
            <Selecao id="ei-projeto" value={projetoId} onChange={(e) => setProjetoId(e.target.value)} {...err("projetoId")}>
              <option value="">Escolha o projeto</option>
              {listaProjetos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
        )}
        {vinculo === "assunto" && (
          <Campo rotulo="Assunto" id="ei-assunto" erro={erros.assunto} className="sm:col-span-2">
            <Entrada id="ei-assunto" list="ei-assuntos" value={assunto} maxLength={40} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: Financeiro" {...err("assunto")} />
            <datalist id="ei-assuntos">
              {assuntos.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </Campo>
        )}
        <Campo rotulo="Responsável (opcional)" id="ei-responsavel" erro={erros.responsavelId}>
          <Selecao id="ei-responsavel" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
            <option value="">Ninguém em especial</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id === socioAtualId ? `${s.nome} (você)` : s.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Prazo (opcional)" id="ei-prazo" erro={erros.prazo} ajuda={prazo ? undefined : "Sem prazo, o item fica depois dos que têm data."}>
          <div className="flex gap-2">
            <Entrada id="ei-prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} {...err("prazo")} />
            {prazo && (
              <Botao type="button" variante="secundario" onClick={() => setPrazo("")} className="shrink-0 px-3">
                Limpar
              </Botao>
            )}
          </div>
        </Campo>
      </form>
    </Modal>
  );
}
