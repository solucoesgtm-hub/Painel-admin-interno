"use client";
// Formulários de "Nossa empresa": dados cadastrais, contratos e botão de copiar.
import { Check, Copy, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AreaTexto, Botao, Campo, Entrada, Selecao, cn } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";
import { useAviso } from "@/components/ui/toast";
import { hojeISO, somarDias } from "@/lib/formato";
import type { ContratoCliente, DadosEmpresa } from "@/lib/regras/empresa";
import { acaoSalvarContrato, acaoSalvarEmpresa } from "./acoes";

/** Copia um valor (CNPJ, e-mail, Pix) e confirma na hora. */
export function Copiar({ valor, rotulo }: { valor: string; rotulo: string }) {
  const [ok, setOk] = useState(false);
  if (!valor) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(valor);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {}
      }}
      aria-label={ok ? `${rotulo} copiado` : `Copiar ${rotulo}`}
      title={ok ? "Copiado" : `Copiar ${rotulo}`}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full text-tinta-3 transition-colors hover:bg-superficie-2 hover:text-tinta",
        ok && "text-ok",
      )}
    >
      {ok ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
    </button>
  );
}

function useFormulario(acao: (d: unknown) => Promise<{ ok: boolean; erros?: Record<string, string>; mensagem?: string }>) {
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [salvando, iniciar] = useTransition();
  const enviar = (dados: Record<string, unknown>, aoSalvar: () => void) =>
    iniciar(async () => {
      const r = await acao(dados);
      if (r.ok) {
        setErros({});
        setMensagem("");
        aoSalvar();
      } else {
        setErros(r.erros ?? {});
        setMensagem(r.mensagem ?? "Não foi possível salvar.");
      }
    });
  const limpar = () => {
    setErros({});
    setMensagem("");
  };
  const err = (prefixo: string, c: string) => (erros[c] ? { "aria-invalid": true, "aria-describedby": `${prefixo}-${c}-erro` } : {});
  return { erros, mensagem, salvando, enviar, limpar, err };
}

/* ---------------- Dados da empresa ---------------- */
export function EditarEmpresa({ empresa }: { empresa: DadosEmpresa }) {
  const [aberto, setAberto] = useState(false);
  const router = useRouter();
  const avisar = useAviso();
  const f = useFormulario(acaoSalvarEmpresa);
  const fechar = () => {
    f.limpar();
    setAberto(false);
  };
  const campo = (id: keyof DadosEmpresa, rotulo: string, extra: React.ComponentProps<"input"> = {}, className?: string) => (
    <Campo rotulo={rotulo} id={`emp-${id}`} erro={f.erros[id]} className={className}>
      <Entrada id={`emp-${id}`} name={id} defaultValue={empresa[id]} {...f.err("emp", id)} {...extra} />
    </Campo>
  );

  return (
    <>
      <Botao variante="secundario" icone={Pencil} onClick={() => setAberto(true)}>
        Editar dados
      </Botao>
      <Modal
        aberto={aberto}
        aoFechar={fechar}
        titulo="Dados da empresa"
        descricao="Aparecem para os três sócios. Toda alteração fica no histórico."
        largura="lg"
        rodape={
          <>
            <Botao type="button" variante="secundario" onClick={fechar}>Cancelar</Botao>
            <Botao type="submit" form="form-empresa" disabled={f.salvando}>{f.salvando ? "Salvando…" : "Salvar dados"}</Botao>
          </>
        }
      >
        <form
          id="form-empresa"
          noValidate
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          // onSubmit (e não action): com action, o React limpa os campos e o sócio perderia o que digitou quando há erro.
          onSubmit={(ev) => {
            ev.preventDefault();
            f.enviar(Object.fromEntries(new FormData(ev.currentTarget).entries()), () => {
              setAberto(false);
              avisar({ tom: "ok", texto: "Dados da empresa salvos" });
              router.refresh();
            });
          }}
        >
          {f.mensagem && <p role="alert" className="text-sm text-risco sm:col-span-2">{f.mensagem}</p>}
          {campo("razaoSocial", "Razão social", { autoComplete: "organization" }, "sm:col-span-2")}
          {campo("nomeFantasia", "Nome fantasia")}
          {campo("cnpj", "CNPJ", { inputMode: "numeric", placeholder: "00.000.000/0000-00" })}
          {campo("email", "E-mail", { type: "email", autoComplete: "email" })}
          {campo("telefone", "Telefone / WhatsApp", { type: "tel", inputMode: "tel", placeholder: "(27) 9…" })}
          {campo("endereco", "Endereço", { autoComplete: "street-address" }, "sm:col-span-2")}
          {campo("municipio", "Município", { placeholder: "Marilândia, ES" })}
          {campo("abertura", "Data de abertura", { type: "date" })}
          {campo("site", "Site", { inputMode: "url", placeholder: "gtm.com.br" })}
          {campo("chavePix", "Chave Pix")}
        </form>
      </Modal>
    </>
  );
}

/* ---------------- Contrato ---------------- */
export type OpcaoLead = { id: string; nome: string };

export function ModalContrato({
  aberto,
  aoFechar,
  contrato,
  leads,
}: {
  aberto: boolean;
  aoFechar: () => void;
  /** Sem contrato: cadastro novo. */
  contrato: ContratoCliente | null;
  leads: OpcaoLead[];
}) {
  const router = useRouter();
  const avisar = useAviso();
  const f = useFormulario(acaoSalvarContrato);
  // O pai troca a `key` a cada abertura, então o estado sempre começa do contrato escolhido.
  const [cliente, setCliente] = useState(contrato?.cliente ?? "");
  const hoje = hojeISO();
  const c = contrato;
  const fechar = () => {
    f.limpar();
    aoFechar();
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={fechar}
      titulo={c ? "Editar contrato" : "Novo contrato"}
      descricao="Vigência e valores. A renovação é avisada 45 dias antes do fim."
      largura="lg"
      rodape={
        <>
          <Botao type="button" variante="secundario" onClick={fechar}>Cancelar</Botao>
          <Botao type="submit" form="form-contrato" disabled={f.salvando}>{f.salvando ? "Salvando…" : "Salvar contrato"}</Botao>
        </>
      }
    >
      <form
        id="form-contrato"
        noValidate
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          const dados = Object.fromEntries(new FormData(ev.currentTarget).entries());
          f.enviar({ ...dados, id: c?.id }, () => {
            aoFechar();
            avisar({ tom: "ok", texto: c ? `Contrato atualizado: ${dados.cliente}` : `Contrato criado: ${dados.cliente}` });
            router.refresh();
          });
        }}
      >
        {f.mensagem && <p role="alert" className="text-sm text-risco sm:col-span-2">{f.mensagem}</p>}
        {leads.length > 0 && (
          <Campo rotulo="Cliente do funil (opcional)" id="ct-leadId" ajuda="Liga o contrato à ficha do cliente." className="sm:col-span-2">
            <Selecao
              id="ct-leadId"
              name="leadId"
              defaultValue={c?.leadId ?? ""}
              onChange={(e) => {
                const l = leads.find((x) => x.id === e.target.value);
                if (l) setCliente(l.nome);
              }}
            >
              <option value="">Sem vínculo</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </Selecao>
          </Campo>
        )}
        <Campo rotulo="Cliente" id="ct-cliente" erro={f.erros.cliente}>
          <Entrada id="ct-cliente" name="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} {...f.err("ct", "cliente")} />
        </Campo>
        <Campo rotulo="Produto ou serviço" id="ct-produto" erro={f.erros.produto}>
          <Entrada id="ct-produto" name="produto" defaultValue={c?.produto} placeholder="Ex.: Atendente WhatsApp" {...f.err("ct", "produto")} />
        </Campo>
        <Campo rotulo="Início da vigência" id="ct-inicio" erro={f.erros.inicio}>
          <Entrada id="ct-inicio" name="inicio" type="date" defaultValue={c?.inicio ?? hoje} {...f.err("ct", "inicio")} />
        </Campo>
        <Campo rotulo="Fim da vigência" id="ct-fim" erro={f.erros.fim}>
          <Entrada id="ct-fim" name="fim" type="date" defaultValue={c?.fim ?? somarDias(hoje, 365)} {...f.err("ct", "fim")} />
        </Campo>
        <Campo rotulo="Mensalidade (R$)" id="ct-valorMensal" erro={f.erros.valorMensal}>
          <Entrada id="ct-valorMensal" name="valorMensal" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={c?.valorMensal ?? 0} {...f.err("ct", "valorMensal")} />
        </Campo>
        <Campo rotulo="Implantação (R$)" id="ct-valorImplantacao" erro={f.erros.valorImplantacao}>
          <Entrada id="ct-valorImplantacao" name="valorImplantacao" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={c?.valorImplantacao ?? 0} {...f.err("ct", "valorImplantacao")} />
        </Campo>
        <Campo rotulo="Situação" id="ct-situacao" ajuda="Encerre o contrato quando o cliente sair ou não renovar.">
          <Selecao id="ct-situacao" name="situacao" defaultValue={c?.situacao ?? "aguardando"}>
            <option value="aguardando">Aguardando assinatura</option>
            <option value="vigente">Assinado / vigente</option>
            <option value="encerrado">Encerrado</option>
          </Selecao>
        </Campo>
        <Campo rotulo="Observações" id="ct-observacoes" erro={f.erros.observacoes} className="sm:col-span-2">
          <AreaTexto id="ct-observacoes" name="observacoes" rows={2} defaultValue={c?.observacoes} placeholder="Ex.: reajuste anual pelo IPCA" />
        </Campo>
      </form>
    </Modal>
  );
}
