// Documento do contrato: um MODELO fixo (texto jurídico revisado) com campos que mudam de um contrato
// para outro (cliente, documento, serviço, escopo, valores, datas). O sistema preenche os campos;
// a IA (opcional) só escreve o escopo do serviço. O texto das cláusulas nunca é gerado pela IA.
//
// Atenção: o modelo abaixo é um ponto de partida e deve ser revisado por um advogado antes do uso.
import { z } from "zod";
import { brl, paraData } from "../formato";

export const FORMAS_PAGAMENTO = ["Pix", "Boleto bancário", "Transferência bancária"] as const;

const texto = (max: number) => z.string().trim().max(max);
const obrigatorio = (max: number, msg: string) => z.string().trim().min(2, msg).max(max);
const reais = z.coerce.number({ message: "Informe um valor em reais." }).min(0, "O valor não pode ser negativo.").max(1_000_000);

/** Campos variáveis do documento (o resto vem do contrato e de "Nossa empresa"). */
export const esquemaDocumento = z
  .object({
    contratanteNome: obrigatorio(160, "Informe o nome ou razão social do cliente."),
    contratanteDocumento: z
      .string()
      .trim()
      .refine((v) => [11, 14].includes(v.replace(/\D/g, "").length), "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)."),
    contratanteEndereco: obrigatorio(240, "Informe o endereço do cliente."),
    contratanteRepresentante: texto(160),
    contratanteEmail: z.string().trim().max(160).email("E-mail inválido.").or(z.literal("")),
    produto: obrigatorio(120, "Informe o serviço."),
    escopo: obrigatorio(3000, "Descreva o que será entregue."),
    prazoImplantacaoDias: z.coerce.number().int().min(1, "Mínimo de 1 dia.").max(365),
    valorImplantacao: reais,
    parcelasImplantacao: z.coerce.number().int().min(1).max(12),
    valorMensal: reais,
    diaVencimento: z.coerce.number().int().min(1, "Entre 1 e 28.").max(28, "Entre 1 e 28."),
    formaPagamento: z.enum(FORMAS_PAGAMENTO),
    inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o início."),
    fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o fim."),
    cidadeAssinatura: obrigatorio(80, "Informe a cidade."),
    dataAssinatura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
    clausulasExtras: texto(2000),
  })
  .refine((d) => d.fim >= d.inicio, { message: "O fim precisa ser depois do início.", path: ["fim"] });
export type DadosDocumento = z.infer<typeof esquemaDocumento>;

/** Dados da GTM (Contratada), vindos de "Nossa empresa". */
export type Contratada = { razaoSocial: string; nomeFantasia: string; cnpj: string; endereco: string; municipio: string; titular: string; email: string };

/** O que ainda falta em "Nossa empresa" para o contrato sair completo. */
export function faltandoContratada(c: Contratada): string[] {
  const campos: [keyof Contratada, string][] = [
    ["razaoSocial", "razão social"],
    ["cnpj", "CNPJ"],
    ["endereco", "endereço"],
    ["municipio", "município"],
    ["titular", "titular"],
  ];
  return campos.filter(([k]) => !c[k].trim()).map(([, n]) => n);
}

/** CPF/CNPJ com pontuação. Outros tamanhos ficam como vieram. */
export function formatarDocumento(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v.trim();
}

const dataExtenso = (iso: string) => paraData(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric" });

/** Meses inteiros entre início e fim (para o texto da vigência). */
export function mesesDeVigencia(inicio: string, fim: string): number {
  // Conta o último dia inteiro: 15/01 a 14/01 do ano seguinte = 12 meses.
  const dias = (Date.parse(`${fim}T12:00:00Z`) - Date.parse(`${inicio}T12:00:00Z`)) / 86_400_000 + 1;
  return Math.max(1, Math.round(dias / 30.4375));
}

/** Monta o contrato em Markdown a partir do modelo. */
export function montarContrato(d: DadosDocumento, gtm: Contratada): string {
  const contratada = gtm.razaoSocial || gtm.nomeFantasia || "GTM Soluções";
  const linhasEscopo = d.escopo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (/^[-•*]\s/.test(l) ? `- ${l.replace(/^[-•*]\s+/, "")}` : l))
    .join("\n");
  const parcelas =
    d.valorImplantacao > 0
      ? d.parcelasImplantacao > 1
        ? `em ${d.parcelasImplantacao} parcelas mensais e iguais de ${brl(d.valorImplantacao / d.parcelasImplantacao)}, a primeira na assinatura deste contrato`
        : "à vista, na assinatura deste contrato"
      : "";
  const meses = mesesDeVigencia(d.inicio, d.fim);
  const representante = d.contratanteRepresentante ? `, neste ato representada por ${d.contratanteRepresentante}` : "";
  const extras = d.clausulasExtras.trim();

  return [
    "# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TECNOLOGIA",
    "",
    "## Partes",
    "",
    `**CONTRATADA:** ${contratada}, inscrita no CNPJ sob o nº ${formatarDocumento(gtm.cnpj) || "[CNPJ]"}, com sede em ${gtm.endereco || "[endereço]"}, ${gtm.municipio || "[município]"}${gtm.titular ? `, neste ato representada por ${gtm.titular}` : ""}.`,
    "",
    `**CONTRATANTE:** ${d.contratanteNome}, inscrito(a) no ${d.contratanteDocumento.replace(/\D/g, "").length === 14 ? "CNPJ" : "CPF"} sob o nº ${formatarDocumento(d.contratanteDocumento)}, com endereço em ${d.contratanteEndereco}${representante}${d.contratanteEmail ? `, e-mail ${d.contratanteEmail}` : ""}.`,
    "",
    "As partes acima identificadas têm entre si justo e acertado o presente contrato, que se regerá pelas cláusulas seguintes.",
    "",
    "## Cláusula 1ª — Objeto",
    "",
    `1.1. O presente contrato tem por objeto a prestação, pela CONTRATADA, do serviço de **${d.produto}**, conforme o escopo abaixo:`,
    "",
    linhasEscopo,
    "",
    "1.2. Qualquer funcionalidade não descrita no escopo será tratada como serviço adicional, mediante orçamento aprovado por escrito.",
    "",
    "## Cláusula 2ª — Implantação",
    "",
    `2.1. A CONTRATADA concluirá a implantação em até ${d.prazoImplantacaoDias} dias corridos, contados do recebimento das informações e acessos necessários fornecidos pela CONTRATANTE.`,
    "2.2. Atrasos causados pela falta de informações, acessos ou aprovações da CONTRATANTE suspendem esse prazo.",
    "",
    "## Cláusula 3ª — Preço e forma de pagamento",
    "",
    ...(d.valorImplantacao > 0 ? [`3.1. Pela implantação, a CONTRATANTE pagará ${brl(d.valorImplantacao)}, ${parcelas}.`] : ["3.1. Não há cobrança de implantação."]),
    `3.2. Pela manutenção e operação do serviço, a CONTRATANTE pagará a mensalidade de ${brl(d.valorMensal)}, com vencimento todo dia ${d.diaVencimento} de cada mês, por ${d.formaPagamento === "Pix" ? "Pix" : d.formaPagamento.toLowerCase()}.`,
    "3.3. O atraso no pagamento sujeitará a CONTRATANTE a multa de 2% (dois por cento) e juros de 1% (um por cento) ao mês, e, após 15 (quinze) dias de atraso, à suspensão do serviço até a regularização.",
    "3.4. Os valores serão reajustados a cada 12 (doze) meses pela variação do IPCA, ou outro índice que o substitua.",
    "",
    "## Cláusula 4ª — Vigência",
    "",
    `4.1. Este contrato vigora de ${dataExtenso(d.inicio)} a ${dataExtenso(d.fim)} (${meses} ${meses === 1 ? "mês" : "meses"}), podendo ser renovado por acordo entre as partes.`,
    "4.2. Qualquer das partes poderá rescindir o contrato mediante aviso por escrito com 30 (trinta) dias de antecedência, sem multa, ficando devidos os valores do período já prestado.",
    "",
    "## Cláusula 5ª — Obrigações",
    "",
    "5.1. Da CONTRATADA: executar o serviço com qualidade técnica, manter o funcionamento e prestar suporte em horário comercial, e informar a CONTRATANTE sobre indisponibilidades previstas.",
    "5.2. Da CONTRATANTE: fornecer informações e acessos necessários, revisar e aprovar conteúdos, e efetuar os pagamentos nas datas combinadas.",
    "5.3. Serviços de terceiros (como WhatsApp/Meta, provedores de IA e hospedagem) seguem as regras e a disponibilidade desses fornecedores, que não são de responsabilidade da CONTRATADA.",
    "",
    "## Cláusula 6ª — Dados pessoais e confidencialidade",
    "",
    "6.1. As partes tratarão os dados pessoais envolvidos conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), usando-os apenas para a execução deste contrato.",
    "6.2. As informações trocadas entre as partes são confidenciais e não serão divulgadas a terceiros sem autorização, exceto por obrigação legal.",
    "",
    ...(extras ? ["## Cláusula 7ª — Condições específicas", "", extras, ""] : []),
    `## Cláusula ${extras ? "8ª" : "7ª"} — Foro`,
    "",
    `As partes elegem o foro da comarca de ${gtm.municipio || d.cidadeAssinatura} para resolver eventuais questões deste contrato.`,
    "",
    `${d.cidadeAssinatura}, ${dataExtenso(d.dataAssinatura)}.`,
    "",
    "",
    "______________________________________",
    `**CONTRATADA:** ${contratada}${gtm.titular ? ` — ${gtm.titular}` : ""}`,
    "",
    "",
    "______________________________________",
    `**CONTRATANTE:** ${d.contratanteNome}${d.contratanteRepresentante ? ` — ${d.contratanteRepresentante}` : ""}`,
    "",
  ].join("\n");
}

/** Markdown simples do modelo → HTML (para Word e impressão). Escapa tudo antes de formatar. */
export function contratoParaHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  const out: string[] = [];
  let lista = false;
  for (const linha of md.split("\n")) {
    if (/^- /.test(linha)) {
      if (!lista) out.push("<ul>");
      lista = true;
      out.push(`<li>${inline(linha.slice(2))}</li>`);
      continue;
    }
    if (lista) {
      out.push("</ul>");
      lista = false;
    }
    if (linha.startsWith("# ")) out.push(`<h1>${inline(linha.slice(2))}</h1>`);
    else if (linha.startsWith("## ")) out.push(`<h2>${inline(linha.slice(3))}</h2>`);
    else if (linha.trim()) out.push(`<p>${inline(linha)}</p>`);
  }
  if (lista) out.push("</ul>");
  return out.join("\n");
}

/** Escopo padrão quando a IA não está ligada: descrição do produto + entregas comuns. */
export function escopoPadrao(produto: string, descricao?: string): string {
  return [
    descricao ? `${descricao}.` : `Implantação e manutenção do serviço ${produto}.`,
    "- Configuração inicial e integração com os canais do cliente",
    "- Treinamento da equipe do cliente para uso do serviço",
    "- Monitoramento, ajustes e suporte em horário comercial",
    "- Relatório mensal de uso e resultados",
  ].join("\n");
}

export const esquemaEscopoIa = z.object({
  resumo: z.string().max(400),
  entregas: z.array(z.string().max(200)).min(3).max(8),
});
