// Regras puras da geração por IA: formato da resposta, custo estimado, teto do mês e Markdown.
// Nada aqui chama a API; o módulo único de chamada fica em src/lib/ia/claude.ts.
import { z } from "zod";

/* ---------------- Formato da resposta (saída estruturada, validada por Zod) ---------------- */
// Sem min/max nos campos: a saída estruturada da API aceita só um subconjunto de JSON Schema.
// A geração é feita em duas chamadas (cada uma cabe no limite de tempo da Vercel):
// 1) relatório + plano; 2) esqueleto de código a partir do plano.
export const esquemaRelatorioPlano = z.object({
  relatorio: z.object({
    resumo: z.string().describe("Resumo do lead para os sócios, 1 a 2 parágrafos."),
    vereditoExplicado: z.string().describe("Por que o veredito e a pontuação fazem sentido (ou não)."),
    pontosFortes: z.array(z.string()),
    riscos: z.array(z.object({ risco: z.string(), mitigacao: z.string() })),
    premissas: z.array(z.string()).describe("O que foi suposto por falta de informação no diagnóstico."),
    proximosPassos: z.array(z.string()),
  }),
  plano: z.object({
    prd: z.object({
      problema: z.string(),
      objetivo: z.string(),
      publico: z.string(),
      escopo: z.array(z.string()),
      foraDoEscopo: z.array(z.string()),
      metricasSucesso: z.array(z.string()),
    }),
    arquitetura: z.object({
      visaoGeral: z.string(),
      stack: z.array(z.object({ camada: z.string(), tecnologia: z.string(), motivo: z.string() })),
      integracoes: z.array(z.string()),
    }),
    modeloDados: z.array(z.object({ entidade: z.string(), campos: z.array(z.string()), observacao: z.string() })),
    telas: z.array(z.object({ nome: z.string(), objetivo: z.string(), elementos: z.array(z.string()) })),
    passos: z.array(
      z.object({ ordem: z.number().int(), titulo: z.string(), descricao: z.string(), estimativaHoras: z.number() }),
    ),
  }),
});

export const esquemaCodigo = z.object({
  codigo: z.object({
    instrucoes: z.string().describe("Como criar o projeto e rodar o esqueleto, em Markdown curto."),
    arquivos: z.array(
      z.object({ caminho: z.string(), linguagem: z.string(), descricao: z.string(), conteudo: z.string() }),
    ),
  }),
});

/** O que fica gravado: relatório e plano sempre; código quando a segunda etapa termina. */
export const esquemaPlanoIA = esquemaRelatorioPlano.extend({ codigo: esquemaCodigo.shape.codigo.optional() });
export type ConteudoPlanoIA = z.infer<typeof esquemaPlanoIA>;
export type CodigoIA = z.infer<typeof esquemaCodigo>["codigo"];

/**
 * O que o botão envia. Etapa "plano": diagnóstico opcional (sem ele, usa o mais recente do lead).
 * Etapa "codigo": completa um plano já gravado.
 */
export const esquemaPedidoPlano = z.discriminatedUnion("etapa", [
  z.object({
    etapa: z.literal("plano"),
    leadId: z.string().trim().min(1).max(64),
    diagnosticoId: z.string().trim().min(1).max(64).optional(),
  }),
  z.object({
    etapa: z.literal("codigo"),
    leadId: z.string().trim().min(1).max(64),
    planoId: z.string().trim().min(1).max(64),
  }),
]);
export type PedidoPlano = z.infer<typeof esquemaPedidoPlano>;

/** Eventos que a rota manda ao navegador, um JSON por linha. */
export type EventoGeracao =
  | { tipo: "progresso"; fase: "pensando" | "escrevendo"; caracteres: number }
  | { tipo: "fim"; plano: PlanoIASalvo }
  | { tipo: "erro"; mensagem: string };

/** Plano salvo, como a ficha do lead recebe. */
export type PlanoIASalvo = {
  id: string;
  leadId: string;
  diagnosticoId: string | null;
  conteudo: ConteudoPlanoIA;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  custoBRL: number;
  autor: string;
  criadoEm: string;
  exemplo: boolean;
};

/** Situação da IA no servidor, para o botão saber o que mostrar. */
export type EstadoIA =
  | { tipo: "ligada"; gastoMes: number; teto: number }
  | { tipo: "exemplo" }
  | { tipo: "desligada" };

/* ---------------- Custo ---------------- */
export type Uso = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/** Preço em US$ por milhão de tokens (entrada, saída), pela família do modelo. Estimativa. */
export function precoModelo(modelo: string): { entrada: number; saida: number } {
  const m = modelo.toLowerCase();
  if (m.includes("haiku")) return { entrada: 1, saida: 5 };
  if (m.includes("sonnet")) return { entrada: 3, saida: 15 };
  // Opus e modelos desconhecidos: usa o preço mais alto para não subestimar o gasto.
  return { entrada: 5, saida: 25 };
}

/** Custo estimado em reais. Cache: gravação custa 1,25× a entrada e leitura 0,1×. */
export function custoEstimadoBRL(uso: Uso, modelo: string, cotacaoDolar: number): number {
  const p = precoModelo(modelo);
  const dolares =
    (uso.input_tokens * p.entrada +
      (uso.cache_creation_input_tokens ?? 0) * p.entrada * 1.25 +
      (uso.cache_read_input_tokens ?? 0) * p.entrada * 0.1 +
      uso.output_tokens * p.saida) /
    1_000_000;
  return Math.round(dolares * cotacaoDolar * 100) / 100;
}

/** Lê um número de variável de ambiente ("50", "50,5" ou "50.5"); valor vazio ou inválido usa o padrão. */
export function numeroDoAmbiente(valor: string | undefined, padrao: number): number {
  const n = Number((valor ?? "").trim().replace(",", "."));
  return valor?.trim() && Number.isFinite(n) && n >= 0 ? n : padrao;
}

export const TETO_PADRAO_BRL = 50;
export const COTACAO_PADRAO = 5.5;

/** Primeiro instante do mês corrente no fuso de São Paulo (UTC−3, sem horário de verão). */
export function inicioDoMes(agora = new Date()): Date {
  const [ano, mes] = agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).split("-");
  return new Date(`${ano}-${mes}-01T00:00:00-03:00`);
}

export function tetoAtingido(gastoMes: number, teto: number) {
  return gastoMes >= teto;
}

/* ---------------- Markdown (copiar e baixar) ---------------- */
const lista = (itens: string[]) => (itens.length ? itens.map((i) => `- ${i}`).join("\n") : "- —");

export function relatorioMarkdown(c: ConteudoPlanoIA, lead: string): string {
  const r = c.relatorio;
  return [
    `# Relatório do lead — ${lead}`,
    "## Resumo",
    r.resumo,
    "## Veredito",
    r.vereditoExplicado,
    "## Pontos fortes",
    lista(r.pontosFortes),
    "## Riscos",
    r.riscos.length ? r.riscos.map((x) => `- **${x.risco}** — ${x.mitigacao}`).join("\n") : "- —",
    "## Premissas",
    lista(r.premissas),
    "## Próximos passos",
    r.proximosPassos.map((p, i) => `${i + 1}. ${p}`).join("\n") || "—",
  ].join("\n\n") + "\n";
}

export function planoMarkdown(c: ConteudoPlanoIA, lead: string): string {
  const { prd, arquitetura, modeloDados, telas, passos } = c.plano;
  const totalHoras = passos.reduce((a, p) => a + p.estimativaHoras, 0);
  return [
    `# Plano de implementação — ${lead}`,
    "## PRD",
    `**Problema:** ${prd.problema}`,
    `**Objetivo:** ${prd.objetivo}`,
    `**Público:** ${prd.publico}`,
    "### Escopo",
    lista(prd.escopo),
    "### Fora do escopo",
    lista(prd.foraDoEscopo),
    "### Métricas de sucesso",
    lista(prd.metricasSucesso),
    "## Arquitetura",
    arquitetura.visaoGeral,
    "| Camada | Tecnologia | Motivo |\n| --- | --- | --- |\n" +
      arquitetura.stack.map((s) => `| ${s.camada} | ${s.tecnologia} | ${s.motivo.replace(/\|/g, "/")} |`).join("\n"),
    "### Integrações",
    lista(arquitetura.integracoes),
    "## Modelo de dados",
    modeloDados.map((e) => `### ${e.entidade}\n${lista(e.campos)}${e.observacao ? `\n\n${e.observacao}` : ""}`).join("\n\n"),
    "## Telas",
    telas.map((t) => `### ${t.nome}\n${t.objetivo}\n\n${lista(t.elementos)}`).join("\n\n"),
    `## Passos de implementação (≈ ${formatarHoras(totalHoras)})`,
    [...passos]
      .sort((a, b) => a.ordem - b.ordem)
      .map((p) => `${p.ordem}. **${p.titulo}** (${formatarHoras(p.estimativaHoras)}) — ${p.descricao}`)
      .join("\n"),
  ].join("\n\n") + "\n";
}

export function codigoMarkdown(c: ConteudoPlanoIA, lead: string): string {
  if (!c.codigo) return `# Esqueleto de código — ${lead}\n\nAinda não gerado.\n`;
  return [
    `# Esqueleto de código — ${lead}`,
    c.codigo.instrucoes,
    ...c.codigo.arquivos.map(
      (a) => `## \`${a.caminho}\`\n${a.descricao}\n\n${cerca(a.conteudo)}${a.linguagem}\n${a.conteudo.replace(/\n$/, "")}\n${cerca(a.conteudo)}`,
    ),
  ].join("\n\n") + "\n";
}

/** Cerca de código mais longa que qualquer sequência de crases dentro do arquivo. */
function cerca(conteudo: string) {
  const maior = Math.max(2, ...(conteudo.match(/`+/g) ?? []).map((s) => s.length));
  return "`".repeat(maior + 1);
}

export function formatarHoras(h: number) {
  return `${h.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

/** Nome de arquivo seguro: "plano-padaria-pao-do-vale.md". */
export function nomeArquivo(parte: string, lead: string) {
  const base = lead
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `${parte}-${base || "lead"}.md`;
}
