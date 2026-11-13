// Regras de "Nossa empresa": dados cadastrais da GTM e contratos com clientes.
import { z } from "zod";
import { diasEntre, hojeISO } from "../formato";

/* ---------------- CNPJ ---------------- */
const soDigitos = (v: string) => v.replace(/\D/g, "");

/** Confere os dois dígitos verificadores do CNPJ. */
export function cnpjValido(valor: string): boolean {
  const d = soDigitos(valor);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digito = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split("").reduce((a, n, i) => a + Number(n) * pesos[i]!, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(d.slice(0, 12));
  const d2 = digito(d.slice(0, 12) + d1);
  return d.endsWith(`${d1}${d2}`);
}

/** 11222333000181 → 11.222.333/0001-81 (devolve o texto original se não tiver 14 dígitos). */
export function formatarCnpj(valor: string): string {
  const d = soDigitos(valor);
  if (d.length !== 14) return valor;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** (27) 99999-8888 a partir de 27999998888; aceita fixo com 10 dígitos. */
export function formatarTelefone(valor: string): string {
  const d = soDigitos(valor);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor;
}

/* ---------------- Dados da empresa ---------------- */
export type DadosEmpresa = {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  municipio: string;
  site: string;
  chavePix: string;
  abertura: string; // aaaa-mm-dd ou ""
};

export const EMPRESA_VAZIA: DadosEmpresa = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  email: "",
  telefone: "",
  endereco: "",
  municipio: "",
  site: "",
  chavePix: "",
  abertura: "",
};

const texto = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`);
const vazio = z.literal("");

export const esquemaEmpresa = z.object({
  razaoSocial: texto(120).min(2, "Informe a razão social."),
  nomeFantasia: texto(80),
  cnpj: z
    .string()
    .trim()
    .refine((v) => v === "" || cnpjValido(v), "CNPJ inválido. Confira os números.")
    .transform((v) => (v ? formatarCnpj(v) : "")),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").or(vazio),
  telefone: z
    .string()
    .trim()
    .refine((v) => v === "" || [10, 11].includes(soDigitos(v).length), "Telefone com DDD, 10 ou 11 números.")
    .transform((v) => (v ? formatarTelefone(v) : "")),
  endereco: texto(160),
  municipio: texto(60),
  site: texto(120),
  chavePix: texto(120),
  abertura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").or(vazio),
});

/** Campos que ainda faltam preencher (para o aviso da tela). */
export function camposFaltando(e: DadosEmpresa): string[] {
  const nomes: [keyof DadosEmpresa, string][] = [
    ["razaoSocial", "razão social"],
    ["cnpj", "CNPJ"],
    ["email", "e-mail"],
    ["telefone", "telefone"],
  ];
  return nomes.filter(([k]) => !e[k]).map(([, n]) => n);
}

/* ---------------- Contratos ---------------- */
export const SITUACOES_CONTRATO = ["aguardando", "vigente", "encerrado"] as const;
export type SituacaoContrato = (typeof SITUACOES_CONTRATO)[number];
export const DIAS_AVISO_RENOVACAO = 45;

export type ContratoCliente = {
  id: string;
  leadId: string | null;
  cliente: string;
  produto: string;
  inicio: string;
  fim: string;
  valorMensal: number;
  valorImplantacao: number;
  situacao: SituacaoContrato;
  observacoes: string;
};

export type EstadoContrato =
  | { tipo: "aguardando" }
  | { tipo: "vigente" }
  | { tipo: "renovar"; dias: number }
  | { tipo: "vencido"; dias: number }
  | { tipo: "encerrado" };

/** Situação exibida: um contrato vigente perto do fim pede renovação; depois do fim, aparece vencido. */
export function estadoContrato(c: Pick<ContratoCliente, "situacao" | "fim">, hoje = hojeISO()): EstadoContrato {
  if (c.situacao === "encerrado") return { tipo: "encerrado" };
  if (c.situacao === "aguardando") return { tipo: "aguardando" };
  const dias = diasEntre(hoje, c.fim);
  if (dias < 0) return { tipo: "vencido", dias: -dias };
  if (dias <= DIAS_AVISO_RENOVACAO) return { tipo: "renovar", dias };
  return { tipo: "vigente" };
}

/** Números do cartão de contratos: vigentes, a renovar, aguardando e receita mensal contratada. */
export function resumoContratos(lista: Pick<ContratoCliente, "situacao" | "fim" | "valorMensal">[], hoje = hojeISO()) {
  let vigentes = 0;
  let renovar = 0;
  let aguardando = 0;
  let vencidos = 0;
  let receitaMensal = 0;
  for (const c of lista) {
    const e = estadoContrato(c, hoje);
    if (e.tipo === "aguardando") aguardando++;
    if (e.tipo === "vencido") vencidos++;
    if (e.tipo === "vigente" || e.tipo === "renovar") {
      vigentes++;
      receitaMensal += c.valorMensal;
      if (e.tipo === "renovar") renovar++;
    }
  }
  return { vigentes, renovar, aguardando, vencidos, receitaMensal: Math.round(receitaMensal * 100) / 100 };
}

const reais = z.coerce.number({ message: "Informe um valor em reais." }).min(0, "O valor não pode ser negativo.").max(1_000_000);
const dataISO = (msg: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, msg);

export const esquemaContrato = z
  .object({
    id: z.string().optional(),
    leadId: z.string().optional().or(vazio),
    cliente: texto(120).min(2, "Informe o cliente."),
    produto: texto(120).min(2, "Informe o produto ou serviço."),
    inicio: dataISO("Informe o início da vigência."),
    fim: dataISO("Informe o fim da vigência."),
    valorMensal: reais,
    valorImplantacao: reais,
    situacao: z.enum(SITUACOES_CONTRATO),
    observacoes: texto(500),
  })
  .refine((c) => c.fim >= c.inicio, { message: "O fim precisa ser depois do início.", path: ["fim"] });
export type DadosContrato = z.infer<typeof esquemaContrato>;
