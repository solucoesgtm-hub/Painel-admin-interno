// Regras puras da geração por IA: formato da resposta, custo estimado, teto do mês e Markdown.
// Nada aqui chama a API; o módulo único de chamada fica em src/lib/ia/claude.ts.
import { z } from "zod";
import { esquemaObservacoesVisita } from "./observacoes";

/* ---------------- Formato da resposta (saída estruturada, validada por Zod) ---------------- */
// Sem min/max nos campos: a saída estruturada da API aceita só um subconjunto de JSON Schema.
// Não há geração de código: o documento é a base para a implementação, feita depois pela equipe.
// São duas chamadas em paralelo (relatório e plano), para cada uma caber com folga no tempo da Vercel.
const nivel = z.enum(["baixa", "media", "alta"]);

export const esquemaRelatorio = z.object({
  relatorio: z.object({
    resumoExecutivo: z.string().describe("Visão geral do lead e da oportunidade, 2 a 3 parágrafos."),
    vereditoExplicado: z.string().describe("Leitura da pontuação e do veredito a partir das notas."),
    diagnosticoAtual: z.object({
      contexto: z.string().describe("Como o negócio funciona hoje: porte, atendimento, ferramentas."),
      processosAtuais: z.array(z.string()),
      gargalos: z.array(z.object({ problema: z.string(), impacto: z.string() })),
    }),
    oportunidade: z.object({
      solucaoProposta: z.string(),
      beneficios: z.array(z.string()),
      economiaEstimada: z.string().describe("Economia em horas e reais, com a conta explicada."),
    }),
    pontosFortes: z.array(z.string()),
    riscos: z.array(z.object({ risco: z.string(), probabilidade: nivel, impacto: nivel, mitigacao: z.string() })),
    premissas: z.array(z.string()).describe("O que foi suposto por falta de informação no diagnóstico."),
    recomendacao: z.string().describe("Seguir, seguir com ressalvas ou não seguir agora, e por quê."),
    proximosPassos: z.array(z.string()),
  }),
});

export const esquemaPlano = z.object({
  plano: z.object({
    prd: z.object({
      problema: z.string(),
      objetivo: z.string(),
      publico: z.string(),
      escopo: z.array(z.string()),
      foraDoEscopo: z.array(z.string()),
      metricasSucesso: z.array(z.string()),
    }),
    requisitos: z.object({
      funcionais: z.array(z.object({ codigo: z.string(), descricao: z.string(), prioridade: z.enum(["essencial", "desejavel"]) })),
      naoFuncionais: z.array(z.string()),
    }),
    fluxos: z.array(
      z.object({ nome: z.string(), ator: z.string(), gatilho: z.string(), passos: z.array(z.string()), resultado: z.string() }),
    ),
    regrasNegocio: z.array(z.object({ codigo: z.string(), regra: z.string(), motivo: z.string() })),
    normas: z.array(z.object({ norma: z.string(), aplicacao: z.string() })),
    arquitetura: z.object({
      visaoGeral: z.string(),
      stack: z.array(z.object({ camada: z.string(), tecnologia: z.string(), motivo: z.string() })),
      integracoes: z.array(z.string()),
    }),
    modeloDados: z.array(z.object({ entidade: z.string(), campos: z.array(z.string()), observacao: z.string() })),
    telas: z.array(z.object({ nome: z.string(), objetivo: z.string(), elementos: z.array(z.string()) })),
    metodologia: z.object({
      abordagem: z.string(),
      fases: z.array(z.object({ nome: z.string(), objetivo: z.string(), entregaveis: z.array(z.string()), duracaoDias: z.number() })),
      criteriosAceite: z.array(z.string()),
    }),
    passos: z.array(
      z.object({ ordem: z.number().int(), titulo: z.string(), descricao: z.string(), estimativaHoras: z.number() }),
    ),
  }),
});

/** O que fica gravado: relatório + plano. Campos a mais (ex.: código de versões antigas) são descartados. */
export const esquemaPlanoIA = esquemaRelatorio.extend(esquemaPlano.shape).extend({
  /** Montada pelo sistema (não pela IA) a partir das observações do diagnóstico. */
  observacoesVisita: esquemaObservacoesVisita.optional(),
});
export type ConteudoPlanoIA = z.infer<typeof esquemaPlanoIA>;

/** O que o botão envia. O diagnóstico é opcional: sem ele, usa o mais recente do lead. */
export const esquemaPedidoPlano = z.object({
  leadId: z.string().trim().min(1).max(64),
  diagnosticoId: z.string().trim().min(1).max(64).optional(),
});
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

/**
 * Orçamento da IA, pensado para os créditos de API (US$ 100):
 * - teto por mês de R$ 55 (≈ US$ 10): cerca de 15 a 20 relatórios de diagnóstico, e os escopos de
 *   contrato, que custam centavos. Assim os créditos duram uns 10 meses;
 * - teto total: para de gerar ao chegar a 95% dos créditos (o custo aqui é estimado, a margem
 *   evita a chave ficar sem saldo no meio de uma geração).
 */
export const TETO_PADRAO_BRL = 55;
export const COTACAO_PADRAO = 5.5;
export const CREDITOS_PADRAO_USD = 100;
export const MARGEM_CREDITOS = 0.95;

/** Os únicos usos permitidos da API do Claude. Qualquer outro é recusado no servidor. */
export const FINALIDADES_IA = ["diagnostico", "contrato"] as const;
export type FinalidadeIa = (typeof FINALIDADES_IA)[number];
export const NOME_FINALIDADE: Record<FinalidadeIa, string> = { diagnostico: "relatório do diagnóstico", contrato: "escopo do contrato" };

/** Quanto precisa sobrar (R$) para começar cada uso: uma geração não estoura o teto no meio. */
export const RESERVA_POR_USO_BRL: Record<FinalidadeIa, number> = { diagnostico: 4, contrato: 0.3 };

export const finalidadePermitida = (f: unknown): f is FinalidadeIa => (FINALIDADES_IA as readonly unknown[]).includes(f);

/** Limite total em reais a partir dos créditos em dólar. */
export const limiteCreditosBRL = (creditosUSD: number, cotacao: number) => creditosUSD * cotacao * MARGEM_CREDITOS;

/**
 * Motivo para não usar a IA agora, ou null quando pode. Regras: só as finalidades permitidas,
 * cabe a reserva no teto do mês e cabe a reserva no que resta dos créditos.
 */
export function bloqueioIa(o: { finalidade: unknown; gastoMes: number; gastoTotal: number; tetoMes: number; limiteTotal: number }): string | null {
  if (!finalidadePermitida(o.finalidade)) return "A IA está reservada para os contratos e o relatório do diagnóstico.";
  const reserva = RESERVA_POR_USO_BRL[o.finalidade];
  if (o.gastoTotal + reserva > o.limiteTotal) return "Os créditos da API do Claude estão no fim. Recarregue no console da Anthropic e ajuste IA_CREDITOS_USD.";
  if (o.gastoMes + reserva > o.tetoMes) return "Teto mensal de IA atingido. As gerações voltam no próximo mês.";
  return null;
}

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
const numerada = (itens: string[]) => (itens.length ? itens.map((i, n) => `${n + 1}. ${i}`).join("\n") : "—");
const celula = (t: string) => t.replace(/\|/g, "/").replace(/\n/g, " ");
const tabela = (cab: string[], linhas: string[][]) =>
  linhas.length
    ? [`| ${cab.join(" | ")} |`, `| ${cab.map(() => "---").join(" | ")} |`, ...linhas.map((l) => `| ${l.map(celula).join(" | ")} |`)].join("\n")
    : "—";
export const NOME_NIVEL = { baixa: "Baixa", media: "Média", alta: "Alta" } as const;

export function relatorioMarkdown(c: ConteudoPlanoIA, lead: string): string {
  const r = c.relatorio;
  return [
    `# Relatório do lead — ${lead}`,
    "## 1. Resumo executivo",
    r.resumoExecutivo,
    ...(c.observacoesVisita
      ? [
          "## Observações da visita",
          c.observacoesVisita.palavrasChave.length ? `**Temas:** ${c.observacoesVisita.palavrasChave.join(" · ")}` : "",
          c.observacoesVisita.destaques.length ? lista(c.observacoesVisita.destaques) : "",
          `> ${c.observacoesVisita.texto.replace(/\n/g, "\n> ")}`,
        ].filter(Boolean)
      : []),
    "## 2. Pontuação e veredito",
    r.vereditoExplicado,
    "## 3. Diagnóstico da situação atual",
    r.diagnosticoAtual.contexto,
    "### Processos atuais",
    lista(r.diagnosticoAtual.processosAtuais),
    "### Gargalos",
    tabela(["Problema", "Impacto"], r.diagnosticoAtual.gargalos.map((g) => [g.problema, g.impacto])),
    "## 4. Oportunidade",
    r.oportunidade.solucaoProposta,
    "### Benefícios",
    lista(r.oportunidade.beneficios),
    `**Economia estimada:** ${r.oportunidade.economiaEstimada}`,
    "## 5. Pontos fortes",
    lista(r.pontosFortes),
    "## 6. Riscos",
    tabela(
      ["Risco", "Probabilidade", "Impacto", "Mitigação"],
      r.riscos.map((x) => [x.risco, NOME_NIVEL[x.probabilidade], NOME_NIVEL[x.impacto], x.mitigacao]),
    ),
    "## 7. Premissas",
    lista(r.premissas),
    "## 8. Recomendação",
    r.recomendacao,
    "## 9. Próximos passos",
    numerada(r.proximosPassos),
  ].join("\n\n") + "\n";
}

export function planoMarkdown(c: ConteudoPlanoIA, lead: string): string {
  const { prd, requisitos, fluxos, regrasNegocio, normas, arquitetura, modeloDados, telas, metodologia, passos } = c.plano;
  const totalHoras = passos.reduce((a, p) => a + p.estimativaHoras, 0);
  return [
    `# Plano de implementação — ${lead}`,
    "## 1. PRD",
    `**Problema:** ${prd.problema}`,
    `**Objetivo:** ${prd.objetivo}`,
    `**Público:** ${prd.publico}`,
    "### Escopo",
    lista(prd.escopo),
    "### Fora do escopo",
    lista(prd.foraDoEscopo),
    "### Métricas de sucesso",
    lista(prd.metricasSucesso),
    "## 2. Requisitos",
    "### Funcionais",
    tabela(["Código", "Requisito", "Prioridade"], requisitos.funcionais.map((x) => [x.codigo, x.descricao, x.prioridade === "essencial" ? "Essencial" : "Desejável"])),
    "### Não funcionais",
    lista(requisitos.naoFuncionais),
    "## 3. Fluxos",
    fluxos
      .map((f) => `### ${f.nome}\n**Ator:** ${f.ator} · **Gatilho:** ${f.gatilho}\n\n${numerada(f.passos)}\n\n**Resultado:** ${f.resultado}`)
      .join("\n\n") || "—",
    "## 4. Regras de negócio",
    tabela(["Código", "Regra", "Motivo"], regrasNegocio.map((x) => [x.codigo, x.regra, x.motivo])),
    "## 5. Normas e conformidade",
    tabela(["Norma", "Como se aplica"], normas.map((x) => [x.norma, x.aplicacao])),
    "## 6. Arquitetura",
    arquitetura.visaoGeral,
    tabela(["Camada", "Tecnologia", "Motivo"], arquitetura.stack.map((s) => [s.camada, s.tecnologia, s.motivo])),
    "### Integrações",
    lista(arquitetura.integracoes),
    "## 7. Modelo de dados",
    modeloDados.map((e) => `### ${e.entidade}\n${lista(e.campos)}${e.observacao ? `\n\n${e.observacao}` : ""}`).join("\n\n") || "—",
    "## 8. Telas",
    telas.map((t) => `### ${t.nome}\n${t.objetivo}\n\n${lista(t.elementos)}`).join("\n\n") || "—",
    "## 9. Metodologia",
    metodologia.abordagem,
    metodologia.fases
      .map((f) => `### ${f.nome} (${f.duracaoDias} ${f.duracaoDias === 1 ? "dia" : "dias"})\n${f.objetivo}\n\n${lista(f.entregaveis)}`)
      .join("\n\n"),
    "### Critérios de aceite",
    lista(metodologia.criteriosAceite),
    `## 10. Passos de implementação (≈ ${formatarHoras(totalHoras)})`,
    [...passos]
      .sort((a, b) => a.ordem - b.ordem)
      .map((p) => `${p.ordem}. **${p.titulo}** (${formatarHoras(p.estimativaHoras)}) — ${p.descricao}`)
      .join("\n"),
  ].join("\n\n") + "\n";
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
