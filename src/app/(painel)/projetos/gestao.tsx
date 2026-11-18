"use client";
// Criar, editar e excluir projetos (modal com formulário). Os dados ficam no Neon.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { AreaTexto, Botao, Campo, Entrada, Selecao } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";
import { useAviso } from "@/components/ui/toast";
import { hojeISO, somarDias } from "@/lib/formato";
import { NOME_SITUACAO_PROJETO, SITUACOES_PROJETO, type ProjetoSalvo } from "@/lib/regras/projetos";
import { acaoExcluirProjeto, acaoSalvarProjeto } from "./acoes";

export type Opcoes = {
  socios: { id: string; nome: string }[];
  leads: { id: string; nome: string }[];
  socioAtualId: string;
};

export function BotaoNovoProjeto(props: Opcoes) {
  const [aberto, setAberto] = useState(0);
  return (
    <>
      <Botao icone={FolderPlus} onClick={() => setAberto((n) => n + 1)}>
        Novo projeto
      </Botao>
      {aberto > 0 && <ModalProjeto key={aberto} {...props} aoFechar={() => setAberto(0)} />}
    </>
  );
}

export function BotaoEditarProjeto({ projeto, ...props }: Opcoes & { projeto: ProjetoSalvo }) {
  const [aberto, setAberto] = useState(0);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((n) => n + 1)}
        aria-label={`Editar projeto ${projeto.nome}`}
        title="Editar projeto"
        className="grid size-11 shrink-0 place-items-center rounded-full text-tinta-3 transition-colors hover:bg-superficie-2 hover:text-tinta"
      >
        <Pencil aria-hidden className="size-4" />
      </button>
      {aberto > 0 && <ModalProjeto key={aberto} {...props} projeto={projeto} aoFechar={() => setAberto(0)} />}
    </>
  );
}

function ModalProjeto({ projeto, socios, leads, socioAtualId, aoFechar }: Opcoes & { projeto?: ProjetoSalvo; aoFechar: () => void }) {
  const router = useRouter();
  const avisar = useAviso();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [salvando, iniciar] = useTransition();
  const [cliente, setCliente] = useState(projeto?.cliente ?? "");
  const [leadId, setLeadId] = useState(projeto?.leadId ?? "");
  const err = (c: string) => (erros[c] ? { "aria-invalid": true as const, "aria-describedby": `pj-${c}-erro` } : {});

  const enviar = (form: FormData) => {
    const dados = Object.fromEntries(form.entries());
    iniciar(async () => {
      const r = await acaoSalvarProjeto({ ...dados, id: projeto?.id ?? "" });
      if (!r.ok) {
        setErros(r.erros);
        setMensagem(r.mensagem);
        return;
      }
      avisar({ tom: "ok", texto: projeto ? "Projeto atualizado" : "Projeto criado" });
      aoFechar();
      router.refresh();
    });
  };

  const excluir = () => {
    if (!projeto || !window.confirm(`Excluir o projeto “${projeto.nome}”? Os lembretes dele também saem. Não dá para desfazer.`)) return;
    iniciar(async () => {
      const r = await acaoExcluirProjeto(projeto.id);
      if (!r.ok) {
        setMensagem(r.mensagem);
        return;
      }
      avisar({ tom: "ok", texto: "Projeto excluído" });
      aoFechar();
      router.refresh();
    });
  };

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={projeto ? "Editar projeto" : "Novo projeto"}
      descricao="Uma entrega para um cliente, com responsável, prazo e lembretes."
      largura="lg"
      rodape={
        <>
          {projeto && (
            <Botao type="button" variante="fantasma" icone={Trash2} onClick={excluir} disabled={salvando} className="mr-auto text-risco hover:bg-risco-suave hover:text-risco">
              Excluir
            </Botao>
          )}
          <Botao type="button" variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-projeto" disabled={salvando}>
            {salvando ? "Salvando…" : projeto ? "Salvar" : "Criar projeto"}
          </Botao>
        </>
      }
    >
      <form
        id="form-projeto"
        noValidate
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(new FormData(e.currentTarget));
        }}
      >
        {mensagem && (
          <p role="alert" className="text-sm text-risco sm:col-span-2">
            {mensagem}
          </p>
        )}
        <Campo rotulo="Nome do projeto" id="pj-nome" erro={erros.nome} className="sm:col-span-2">
          <Entrada id="pj-nome" name="nome" defaultValue={projeto?.nome} placeholder="Ex.: Atendente no WhatsApp" {...err("nome")} />
        </Campo>
        <Campo rotulo="Lead no funil (opcional)" id="pj-lead" ajuda="Liga o projeto à ficha do cliente.">
          <Selecao
            id="pj-lead"
            name="leadId"
            value={leadId}
            onChange={(e) => {
              setLeadId(e.target.value);
              const l = leads.find((x) => x.id === e.target.value);
              if (l && !cliente.trim()) setCliente(l.nome);
            }}
          >
            <option value="">Sem ligação</option>
            {leads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Cliente" id="pj-cliente" erro={erros.cliente}>
          <Entrada id="pj-cliente" name="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do comércio" {...err("cliente")} />
        </Campo>
        <Campo rotulo="Responsável" id="pj-dono" erro={erros.donoId}>
          <Selecao id="pj-dono" name="donoId" defaultValue={projeto ? (projeto.donoId ?? "") : socioAtualId} {...err("donoId")}>
            <option value="">Sem responsável</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Situação" id="pj-situacao">
          <Selecao id="pj-situacao" name="situacao" defaultValue={projeto?.situacao ?? "planejado"}>
            {SITUACOES_PROJETO.map((s) => (
              <option key={s} value={s}>
                {NOME_SITUACAO_PROJETO[s]}
              </option>
            ))}
          </Selecao>
        </Campo>
        <Campo rotulo="Prazo" id="pj-prazo" erro={erros.prazo}>
          <Entrada id="pj-prazo" name="prazo" type="date" defaultValue={projeto?.prazo ?? somarDias(hojeISO(), 30)} {...err("prazo")} />
        </Campo>
        <Campo rotulo="Repositório (opcional)" id="pj-repositorio" erro={erros.repositorio}>
          <Entrada id="pj-repositorio" name="repositorio" defaultValue={projeto?.repositorio} placeholder="github.com/gtm/projeto" {...err("repositorio")} />
        </Campo>
        <Campo rotulo="Descrição (opcional)" id="pj-descricao" erro={erros.descricao} className="sm:col-span-2">
          <AreaTexto id="pj-descricao" name="descricao" rows={3} defaultValue={projeto?.descricao} placeholder="O que será entregue, combinados com o cliente…" />
        </Campo>
      </form>
    </Modal>
  );
}
