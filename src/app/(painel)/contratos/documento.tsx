"use client";
// Gerar o documento do contrato: o formulário traz o que muda de um contrato para outro (já preenchido
// com o contrato e "Nossa empresa"), o escopo pode ser sugerido pela IA, e o texto final sai do modelo.
// Depois: copiar, baixar para o Word ou imprimir / salvar em PDF.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Copy, Download, FileText, Printer, Sparkles, Wand2 } from "lucide-react";
import { AreaTexto, Aviso, Botao, Campo, Entrada, Selecao } from "@/components/ui/base";
import { BotaoTexto } from "@/components/ui/botao-link";
import { Modal } from "@/components/ui/modal";
import { useAviso } from "@/components/ui/toast";
import { hojeISO } from "@/lib/formato";
import { contratoParaHtml, FORMAS_PAGAMENTO, type DadosDocumento } from "@/lib/regras/contrato-documento";
import type { ContratoCliente } from "@/lib/regras/empresa";
import { acaoGerarDocumento, acaoSugerirEscopo } from "./acoes";

type Valores = Record<keyof DadosDocumento, string>;

function iniciais(c: ContratoCliente, cidade: string): Valores {
  const salvo = (c.documentoDados ?? {}) as Partial<Record<keyof DadosDocumento, unknown>>;
  const s = (k: keyof DadosDocumento, padrao: string | number) => String(salvo[k] ?? padrao);
  return {
    contratanteNome: s("contratanteNome", c.cliente.replace(/\s*\(exemplo\)$/, "")),
    contratanteDocumento: s("contratanteDocumento", ""),
    contratanteEndereco: s("contratanteEndereco", ""),
    contratanteRepresentante: s("contratanteRepresentante", ""),
    contratanteEmail: s("contratanteEmail", ""),
    // Serviço, valores e vigência sempre do contrato (podem ter mudado desde a última geração).
    produto: c.produto,
    escopo: s("escopo", ""),
    prazoImplantacaoDias: s("prazoImplantacaoDias", 15),
    valorImplantacao: String(c.valorImplantacao),
    parcelasImplantacao: s("parcelasImplantacao", 1),
    valorMensal: String(c.valorMensal),
    diaVencimento: s("diaVencimento", Math.min(28, Number(c.inicio.slice(8, 10)) || 10)),
    formaPagamento: s("formaPagamento", "Pix"),
    inicio: c.inicio,
    fim: c.fim,
    cidadeAssinatura: s("cidadeAssinatura", cidade),
    dataAssinatura: hojeISO(),
    clausulasExtras: s("clausulasExtras", ""),
  };
}

const nomeArquivo = (cliente: string) =>
  `contrato-${cliente
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

const ESTILO_DOC = "body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.5;color:#111;max-width:720px;margin:32px auto;padding:0 24px}h1{font-size:15pt;text-align:center;margin-bottom:24px}h2{font-size:12pt;margin-top:20px}p{margin:6px 0;text-align:justify}ul{margin:6px 0 6px 20px}";
const paginaHtml = (titulo: string, corpo: string) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title><style>${ESTILO_DOC}</style></head><body>${corpo}</body></html>`;

export function ModalDocumento({
  contrato,
  cidade,
  faltando,
  iaLigada,
  aoFechar,
}: {
  contrato: ContratoCliente;
  cidade: string;
  /** Campos de "Nossa empresa" que faltam para o contrato sair completo. */
  faltando: string[];
  iaLigada: boolean;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [v, setV] = useState<Valores>(() => iniciais(contrato, cidade));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [documento, setDocumento] = useState<string | null>(null);
  const [gerando, iniciarGeracao] = useTransition();
  const [sugerindo, iniciarSugestao] = useTransition();
  const muda = (k: keyof DadosDocumento) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }));
  const err = (k: string) => (erros[k] ? { "aria-invalid": true as const } : {});

  const sugerir = () =>
    iniciarSugestao(async () => {
      const r = await acaoSugerirEscopo({ produto: v.produto, cliente: v.contratanteNome, observacoes: contrato.observacoes });
      if (!r.ok) return avisar({ tom: "risco", texto: r.mensagem });
      setV((x) => ({ ...x, escopo: r.escopo }));
      avisar(r.aviso ? { tom: "info", texto: r.aviso } : { tom: "ok", texto: "Escopo escrito pela IA. Revise antes de gerar." });
    });

  const gerar = () =>
    iniciarGeracao(async () => {
      setErros({});
      setMensagem("");
      const r = await acaoGerarDocumento(contrato.id, v);
      if (!r.ok) {
        setErros(r.erros);
        setMensagem(r.mensagem);
        return;
      }
      setDocumento(r.documento);
      router.refresh();
    });

  const html = documento ? contratoParaHtml(documento) : "";
  const baixarWord = () => {
    const url = URL.createObjectURL(new Blob([`﻿${paginaHtml("Contrato", html)}`], { type: "application/msword" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nomeArquivo(v.contratanteNome)}.doc`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const imprimir = () => {
    const w = window.open("", "_blank");
    if (!w) return avisar({ tom: "risco", texto: "O navegador bloqueou a janela de impressão." });
    w.document.write(paginaHtml(`Contrato — ${v.contratanteNome}`, html));
    w.document.close();
    w.focus();
    w.print();
  };
  const copiar = async () => {
    await navigator.clipboard.writeText(documento ?? "");
    avisar({ tom: "ok", texto: "Texto do contrato copiado" });
  };

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      largura="lg"
      titulo={documento ? "Contrato pronto" : "Gerar documento do contrato"}
      descricao={documento ? "Revise o texto antes de enviar para assinatura." : "Só os campos que mudam de um contrato para outro. As cláusulas vêm do modelo da GTM."}
      rodape={
        documento ? (
          <>
            <Botao type="button" variante="fantasma" icone={ArrowLeft} onClick={() => setDocumento(null)} className="sm:mr-auto">
              Voltar e ajustar
            </Botao>
            <Botao type="button" variante="secundario" icone={Copy} onClick={copiar}>
              Copiar texto
            </Botao>
            <Botao type="button" variante="secundario" icone={Printer} onClick={imprimir}>
              Imprimir ou PDF
            </Botao>
            <Botao type="button" icone={Download} onClick={baixarWord}>
              Baixar para Word
            </Botao>
          </>
        ) : (
          <>
            <Botao type="button" variante="secundario" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" form="form-documento" icone={FileText} disabled={gerando}>
              {gerando ? "Gerando…" : "Gerar contrato"}
            </Botao>
          </>
        )
      }
    >
      {documento ? (
        <article className="doc-contrato rounded-xl bg-white p-6 text-[#111] shadow-inner ring-1 ring-areia sm:p-8" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <form
          id="form-documento"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            gerar();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {faltando.length > 0 && (
            <Aviso tom="alerta" titulo="Dados da GTM incompletos" className="sm:col-span-2">
              Faltam em Nossa empresa: {faltando.join(", ")}. O contrato sai com marcações no lugar.{" "}
              <BotaoTexto href="/empresa" alvo={false}>
                Completar agora
              </BotaoTexto>
            </Aviso>
          )}
          {mensagem && (
            <p role="alert" className="text-sm text-risco sm:col-span-2">
              {mensagem}
            </p>
          )}

          <p className="text-xs font-semibold uppercase tracking-wide text-tinta-3 sm:col-span-2">Cliente (contratante)</p>
          <Campo rotulo="Nome ou razão social" id="dc-nome" erro={erros.contratanteNome}>
            <Entrada id="dc-nome" value={v.contratanteNome} onChange={muda("contratanteNome")} {...err("contratanteNome")} />
          </Campo>
          <Campo rotulo="CPF ou CNPJ" id="dc-doc" erro={erros.contratanteDocumento}>
            <Entrada id="dc-doc" inputMode="numeric" value={v.contratanteDocumento} onChange={muda("contratanteDocumento")} placeholder="00.000.000/0000-00" {...err("contratanteDocumento")} />
          </Campo>
          <Campo rotulo="Endereço completo" id="dc-end" erro={erros.contratanteEndereco} className="sm:col-span-2">
            <Entrada id="dc-end" value={v.contratanteEndereco} onChange={muda("contratanteEndereco")} placeholder="Rua, número, bairro, cidade/UF" {...err("contratanteEndereco")} />
          </Campo>
          <Campo rotulo="Representante (opcional)" id="dc-rep" ajuda="Para empresa: quem assina, com o cargo.">
            <Entrada id="dc-rep" value={v.contratanteRepresentante} onChange={muda("contratanteRepresentante")} placeholder="Ex.: Maria Souza, sócia-administradora" />
          </Campo>
          <Campo rotulo="E-mail (opcional)" id="dc-email" erro={erros.contratanteEmail}>
            <Entrada id="dc-email" type="email" value={v.contratanteEmail} onChange={muda("contratanteEmail")} {...err("contratanteEmail")} />
          </Campo>

          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-tinta-3 sm:col-span-2">Serviço</p>
          <Campo rotulo="Serviço contratado" id="dc-produto" erro={erros.produto}>
            <Entrada id="dc-produto" value={v.produto} onChange={muda("produto")} {...err("produto")} />
          </Campo>
          <Campo rotulo="Prazo de implantação (dias)" id="dc-prazo" erro={erros.prazoImplantacaoDias}>
            <Entrada id="dc-prazo" type="number" min={1} max={365} value={v.prazoImplantacaoDias} onChange={muda("prazoImplantacaoDias")} {...err("prazoImplantacaoDias")} />
          </Campo>
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="dc-escopo" className="text-[13px] font-medium text-tinta-2">
                Escopo do serviço
              </label>
              <Botao type="button" variante="secundario" icone={iaLigada ? Sparkles : Wand2} onClick={sugerir} disabled={sugerindo || v.produto.trim().length < 2} className="min-h-10 px-4">
                {sugerindo ? "Escrevendo…" : iaLigada ? "Escrever com IA" : "Usar escopo padrão"}
              </Botao>
            </div>
            <AreaTexto
              id="dc-escopo"
              rows={6}
              value={v.escopo}
              onChange={muda("escopo")}
              placeholder={"Uma frase sobre o serviço e, abaixo, uma entrega por linha começando com “-”.\n- Configuração do atendente no WhatsApp\n- Treinamento da equipe"}
              {...err("escopo")}
            />
            {erros.escopo ? (
              <p className="mt-1 text-xs text-risco" role="alert">
                {erros.escopo}
              </p>
            ) : (
              <p className="mt-1 text-xs text-tinta-3">A IA só escreve este trecho. As cláusulas do contrato não mudam.</p>
            )}
          </div>

          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-tinta-3 sm:col-span-2">Valores e vigência</p>
          <Campo rotulo="Implantação (R$)" id="dc-impl" erro={erros.valorImplantacao}>
            <Entrada id="dc-impl" type="number" min={0} step="0.01" inputMode="decimal" value={v.valorImplantacao} onChange={muda("valorImplantacao")} {...err("valorImplantacao")} />
          </Campo>
          <Campo rotulo="Parcelas da implantação" id="dc-parc">
            <Selecao id="dc-parc" value={v.parcelasImplantacao} onChange={muda("parcelasImplantacao")}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "À vista" : `${n}x`}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Mensalidade (R$)" id="dc-mensal" erro={erros.valorMensal}>
            <Entrada id="dc-mensal" type="number" min={0} step="0.01" inputMode="decimal" value={v.valorMensal} onChange={muda("valorMensal")} {...err("valorMensal")} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Vence todo dia" id="dc-dia" erro={erros.diaVencimento}>
              <Entrada id="dc-dia" type="number" min={1} max={28} value={v.diaVencimento} onChange={muda("diaVencimento")} {...err("diaVencimento")} />
            </Campo>
            <Campo rotulo="Pagamento" id="dc-forma">
              <Selecao id="dc-forma" value={v.formaPagamento} onChange={muda("formaPagamento")}>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Selecao>
            </Campo>
          </div>
          <Campo rotulo="Início da vigência" id="dc-inicio" erro={erros.inicio}>
            <Entrada id="dc-inicio" type="date" value={v.inicio} onChange={muda("inicio")} {...err("inicio")} />
          </Campo>
          <Campo rotulo="Fim da vigência" id="dc-fim" erro={erros.fim}>
            <Entrada id="dc-fim" type="date" value={v.fim} onChange={muda("fim")} {...err("fim")} />
          </Campo>
          <Campo rotulo="Cidade da assinatura" id="dc-cidade" erro={erros.cidadeAssinatura}>
            <Entrada id="dc-cidade" value={v.cidadeAssinatura} onChange={muda("cidadeAssinatura")} {...err("cidadeAssinatura")} />
          </Campo>
          <Campo rotulo="Data da assinatura" id="dc-data" erro={erros.dataAssinatura}>
            <Entrada id="dc-data" type="date" value={v.dataAssinatura} onChange={muda("dataAssinatura")} {...err("dataAssinatura")} />
          </Campo>
          <Campo rotulo="Condições específicas (opcional)" id="dc-extras" ajuda="Viram uma cláusula própria, como escrito aqui." className="sm:col-span-2">
            <AreaTexto id="dc-extras" rows={2} value={v.clausulasExtras} onChange={muda("clausulasExtras")} placeholder="Ex.: Inclui duas visitas presenciais por mês." />
          </Campo>
          <Aviso tom="info" className="sm:col-span-2">
            O modelo é um ponto de partida: peça a um advogado para revisar as cláusulas uma vez. Depois disso, cada contrato muda só nestes campos.
          </Aviso>
        </form>
      )}
    </Modal>
  );
}
