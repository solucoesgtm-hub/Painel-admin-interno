"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilLine } from "lucide-react";
import { AreaTexto, Botao, Campo, Entrada, Selecao } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";
import { useAviso } from "@/components/ui/toast";
import type { Lead, Socio } from "@/lib/demo/dados";
import { ORIGENS, SEGMENTOS } from "@/lib/regras/funil";
import { acaoEditarLead } from "../acoes";

/** Botão + formulário para editar dados, próximo passo e proposta do lead. */
export function EditarLead({ lead, socios }: { lead: Lead; socios: Socio[] }) {
  const router = useRouter();
  const avisar = useAviso();
  const [aberto, setAberto] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [salvando, iniciar] = useTransition();

  function enviar(form: FormData) {
    const dados = { ...Object.fromEntries(form.entries()), leadId: lead.id };
    iniciar(async () => {
      const r = await acaoEditarLead(dados);
      if (r.ok) {
        setErros({});
        setMensagem("");
        setAberto(false);
        avisar({ tom: "ok", texto: "Alterações salvas" });
        router.refresh();
      } else {
        setErros(r.erros);
        setMensagem(r.mensagem);
      }
    });
  }

  const err = (c: string) => (erros[c] ? { "aria-invalid": true, "aria-describedby": `ed-${c}-erro` } : {});
  // Mantém na lista um valor antigo que não esteja nas opções padrão.
  const opcoes = (base: string[], atual: string) => (atual && !base.includes(atual) ? [atual, ...base] : base);

  return (
    <>
      <Botao variante="secundario" icone={PencilLine} onClick={() => setAberto(true)}>
        Editar
      </Botao>
      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Editar lead"
        descricao="Dono, próximo passo e data continuam obrigatórios."
        largura="lg"
        rodape={
          <>
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>Cancelar</Botao>
            <Botao type="submit" form="form-editar-lead" disabled={salvando}>{salvando ? "Salvando…" : "Salvar alterações"}</Botao>
          </>
        }
      >
        <form id="form-editar-lead" key={aberto ? "aberto" : "fechado"} action={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
          {mensagem && <p role="alert" className="text-sm text-risco sm:col-span-2">{mensagem}</p>}
          <Campo rotulo="Nome do comércio" id="ed-nome" erro={erros.nome} className="sm:col-span-2">
            <Entrada id="ed-nome" name="nome" defaultValue={lead.nome} autoComplete="off" {...err("nome")} />
          </Campo>
          <Campo rotulo="Segmento" id="ed-segmento">
            <Selecao id="ed-segmento" name="segmento" defaultValue={lead.segmento}>
              <option value="">Selecione</option>
              {opcoes(SEGMENTOS, lead.segmento).map((s) => <option key={s}>{s}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Cidade" id="ed-cidade"><Entrada id="ed-cidade" name="cidade" defaultValue={lead.cidade} /></Campo>
          <Campo rotulo="Nome do contato" id="ed-contatoNome"><Entrada id="ed-contatoNome" name="contatoNome" defaultValue={lead.contatoNome} /></Campo>
          <Campo rotulo="Telefone" id="ed-contatoTelefone"><Entrada id="ed-contatoTelefone" name="contatoTelefone" inputMode="tel" defaultValue={lead.contatoTelefone} /></Campo>
          <Campo rotulo="Origem do lead" id="ed-origem">
            <Selecao id="ed-origem" name="origem" defaultValue={lead.origem}>
              <option value="">Selecione</option>
              {opcoes(ORIGENS, lead.origem).map((s) => <option key={s}>{s}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Dono" id="ed-donoId" erro={erros.donoId}>
            <Selecao id="ed-donoId" name="donoId" defaultValue={lead.donoId} {...err("donoId")}>
              {socios.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Próximo passo" id="ed-proximoPasso" erro={erros.proximoPasso} className="sm:col-span-2">
            <AreaTexto id="ed-proximoPasso" name="proximoPasso" rows={2} defaultValue={lead.proximoPasso} {...err("proximoPasso")} />
          </Campo>
          <Campo rotulo="Data do próximo passo" id="ed-proximoPassoData" erro={erros.proximoPassoData} className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
            <Entrada id="ed-proximoPassoData" name="proximoPassoData" type="date" defaultValue={lead.proximoPassoData} {...err("proximoPassoData")} />
          </Campo>
          <Campo rotulo="Implantação (R$)" id="ed-valorImplantacao" erro={erros.valorImplantacao} ajuda="Valor da proposta. Deixe 0 se ainda não há proposta.">
            <Entrada id="ed-valorImplantacao" name="valorImplantacao" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={lead.valorImplantacao} {...err("valorImplantacao")} />
          </Campo>
          <Campo rotulo="Mensalidade (R$)" id="ed-mensalidade" erro={erros.mensalidade}>
            <Entrada id="ed-mensalidade" name="mensalidade" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={lead.mensalidade} {...err("mensalidade")} />
          </Campo>
        </form>
      </Modal>
    </>
  );
}
