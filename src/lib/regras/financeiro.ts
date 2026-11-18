// Regras do financeiro: situação das mensalidades, conciliação e divisão entre sócios.
import { hojeISO } from "../formato";

export type SituacaoMensalidade = "a_vencer" | "pago" | "atrasado";

export function situacaoMensalidade(vencimento: string, pagoEm: string | null, hoje = hojeISO()): SituacaoMensalidade {
  if (pagoEm) return "pago";
  return vencimento < hoje ? "atrasado" : "a_vencer";
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Conciliação automática: valor igual (até 1 centavo) e pagador com o mesmo documento ou nome. */
export function conciliaAutomatico(
  entrada: { valor: number; pagadorDoc?: string; pagadorNome: string },
  cobranca: { valor: number; clienteDoc?: string; clienteNome: string },
) {
  const valorBate = Math.abs(entrada.valor - cobranca.valor) < 0.01;
  const pagadorBate =
    (!!entrada.pagadorDoc && entrada.pagadorDoc === cobranca.clienteDoc) ||
    normalizar(entrada.pagadorNome) === normalizar(cobranca.clienteNome);
  return valorBate && pagadorBate;
}

/** Divide o resultado em partes iguais; os centavos que sobram vão para os primeiros. */
export function dividirEntreSocios(resultado: number, socios: number) {
  const centavos = Math.round(resultado * 100);
  const base = Math.trunc(centavos / socios);
  const sobra = centavos - base * socios;
  return Array.from({ length: socios }, (_, i) => (base + (i < sobra ? 1 : 0)) / 100);
}

/* ================== Extrato do banco → telas do financeiro ================== */

export type LancamentoBanco = {
  id: string;
  data: string; // AAAA-MM-DD
  descricao: string;
  valor: number; // sempre positivo
  tipo: "entrada" | "saida";
  conciliadoCom: string | null;
  categoria?: string;
};

export type CobrancaMensal = {
  id: string;
  cliente: string;
  produto: string;
  valor: number;
  vencimento: string;
  pagoEm: string | null;
};

/** Contrato vigente com mensalidade → cobrança do mês de `hoje`, vencendo no dia do início do contrato. */
export function mensalidadesDoMes(
  contratos: { id: string; cliente: string; produto: string; inicio: string; fim: string; valorMensal: number; situacao: string }[],
  hoje = hojeISO(),
): CobrancaMensal[] {
  const mes = hoje.slice(0, 7);
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return contratos
    .filter((c) => c.situacao === "vigente" && c.valorMensal > 0 && c.inicio.slice(0, 7) <= mes && c.fim.slice(0, 7) >= mes)
    .map((c) => {
      const dia = Math.min(Number(c.inicio.slice(8, 10)) || 10, ultimoDia);
      return {
        id: `${c.id}-${mes}`,
        cliente: c.cliente,
        produto: c.produto,
        valor: c.valorMensal,
        vencimento: `${mes}-${String(dia).padStart(2, "0")}`,
        pagoEm: null,
      };
    })
    .sort((x, y) => x.vencimento.localeCompare(y.vencimento));
}

const PALAVRAS_VAZIAS = new Set(["de", "da", "do", "das", "dos", "ltda", "mei", "eireli", "exemplo", "pix", "recebido", "ted", "doc", "clinica", "loja"]);
const palavras = (t: string) =>
  normalizar(t)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 && !PALAVRAS_VAZIAS.has(p));

/** O extrato cita o cliente? Basta uma palavra significativa do nome aparecer na descrição. */
export function citaCliente(descricao: string, cliente: string) {
  const d = new Set(palavras(descricao));
  return palavras(cliente).some((p) => d.has(p));
}

/**
 * Conciliação automática: cada entrada paga no máximo uma cobrança e vice-versa, quando o valor
 * bate (até 1 centavo) e a descrição cita o cliente. O resto fica para conferência manual.
 */
export function conciliar(extrato: LancamentoBanco[], cobrancas: CobrancaMensal[]) {
  const usadas = new Set<string>();
  const pagas = new Map<string, string>();
  const lancamentos = extrato.map((l) => {
    if (l.tipo !== "entrada" || l.conciliadoCom) return l;
    const c = cobrancas.find(
      (c) => !c.pagoEm && !usadas.has(c.id) && Math.abs(c.valor - l.valor) < 0.01 && citaCliente(l.descricao, c.cliente),
    );
    if (!c) return l;
    usadas.add(c.id);
    pagas.set(c.id, l.data);
    return { ...l, conciliadoCom: `Mensalidade — ${c.cliente.replace(/\s*\(exemplo\)$/, "")}` };
  });
  return {
    lancamentos,
    cobrancas: cobrancas.map((c) => (c.pagoEm || !pagas.has(c.id) ? c : { ...c, pagoEm: pagas.get(c.id)! })),
  };
}

const CATEGORIAS_SAIDA: [string, string[]][] = [
  ["Impostos", ["das", "simples nacional", "darf", "imposto", "iss", "inss"]],
  ["IA", ["anthropic", "openai", "claude", "api de ia"]],
  ["Infraestrutura", ["vercel", "neon", "hospedagem", "servidor", "servidores", "dominio", "registro.br", "cloudflare", "aws"]],
  ["Ferramentas", ["github", "figma", "notion", "workspace", "assinatura", "software"]],
  ["Deslocamento", ["combustivel", "posto", "uber", "pedagio", "estacionamento"]],
  ["Tarifas bancárias", ["tarifa", "juros", "iof"]],
  ["Marketing", ["meta ads", "facebook", "instagram", "google ads", "anuncio"]],
];

/** Categoria de uma saída pelas palavras da descrição; "Outros" quando nada bate. */
export function categoriaSaida(descricao: string): string {
  const d = ` ${normalizar(descricao).replace(/[^a-z0-9. ]/g, " ")} `;
  for (const [nome, chaves] of CATEGORIAS_SAIDA) if (chaves.some((c) => d.includes(` ${c} `))) return nome;
  return "Outros";
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Soma entradas e saídas por mês, dos `meses` mais recentes até o mês de `hoje` (meses vazios com zero). */
export function serieMensal(extrato: LancamentoBanco[], meses: number, hoje = hojeISO()) {
  const [a, m] = hoje.slice(0, 7).split("-").map(Number) as [number, number];
  return Array.from({ length: meses }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (meses - 1 - i), 1));
    const chave = d.toISOString().slice(0, 7);
    const doMes = extrato.filter((l) => l.data.startsWith(chave));
    const soma = (t: "entrada" | "saida") => Math.round(doMes.filter((l) => l.tipo === t).reduce((s, l) => s + l.valor, 0) * 100) / 100;
    return { mes: MESES_CURTOS[d.getUTCMonth()]!, chave, entradas: soma("entrada"), saidas: soma("saida") };
  });
}

/** Planilha do contador: CSV com ";" e vírgula decimal (abre direto no Excel em português). */
export function planilhaContador(extrato: LancamentoBanco[]): string {
  const campo = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const linhas = [...extrato]
    .sort((x, y) => x.data.localeCompare(y.data))
    .map((l) =>
      [
        `${l.data.slice(8, 10)}/${l.data.slice(5, 7)}/${l.data.slice(0, 4)}`,
        l.tipo === "entrada" ? "Entrada" : "Saída",
        campo(l.descricao),
        campo(l.tipo === "saida" ? (l.categoria ?? categoriaSaida(l.descricao)) : (l.conciliadoCom ?? "")),
        (l.tipo === "entrada" ? l.valor : -l.valor).toFixed(2).replace(".", ","),
      ].join(";"),
    );
  return ["Data;Tipo;Descrição;Categoria ou conciliação;Valor (R$)", ...linhas].join("\r\n");
}
