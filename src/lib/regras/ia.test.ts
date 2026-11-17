import { describe, expect, it } from "vitest";
import { exemploRelatorioPlano } from "../ia/exemplo";
import {
  custoEstimadoBRL,
  esquemaPedidoPlano,
  esquemaPlano,
  esquemaPlanoIA,
  esquemaRelatorio,
  inicioDoMes,
  nomeArquivo,
  numeroDoAmbiente,
  planoMarkdown,
  precoModelo,
  relatorioMarkdown,
  tetoAtingido,
} from "./ia";

const base = exemploRelatorioPlano({ nome: "Padaria Exemplo", segmento: "Padaria", pontuacao: 72, veredito: "quente" });

describe("IA: relatório e plano", () => {
  it("o exemplo da demonstração passa nos esquemas", () => {
    expect(esquemaPlanoIA.safeParse(base).success).toBe(true);
    expect(esquemaRelatorio.safeParse({ relatorio: base.relatorio }).success).toBe(true);
    expect(esquemaPlano.safeParse({ plano: base.plano }).success).toBe(true);
  });

  it("recusa resposta incompleta ou com nível de risco fora da lista", () => {
    expect(esquemaPlanoIA.safeParse({ relatorio: base.relatorio }).success).toBe(false);
    const ruim = { ...base.relatorio, riscos: [{ risco: "x", probabilidade: "enorme", impacto: "alta", mitigacao: "y" }] };
    expect(esquemaRelatorio.safeParse({ relatorio: ruim }).success).toBe(false);
  });

  it("descarta campos que não fazem parte do documento (como código)", () => {
    const r = esquemaPlanoIA.parse({ ...base, codigo: { instrucoes: "", arquivos: [] } });
    expect("codigo" in r).toBe(false);
  });

  it("valida o pedido", () => {
    expect(esquemaPedidoPlano.safeParse({ leadId: "l-1" }).success).toBe(true);
    expect(esquemaPedidoPlano.safeParse({ leadId: "l-1", diagnosticoId: "d-1" }).success).toBe(true);
    expect(esquemaPedidoPlano.safeParse({ leadId: "" }).success).toBe(false);
    expect(esquemaPedidoPlano.safeParse(null).success).toBe(false);
  });

  it("estima o custo pela família do modelo, com cache", () => {
    expect(precoModelo("claude-haiku-4-5")).toEqual({ entrada: 1, saida: 5 });
    expect(precoModelo("claude-sonnet-5-5")).toEqual({ entrada: 3, saida: 15 });
    expect(precoModelo("modelo-novo")).toEqual({ entrada: 5, saida: 25 });
    // 1M de entrada (US$ 3) + 100 mil de saída (US$ 1,50) = US$ 4,50 × 5 = R$ 22,50
    expect(custoEstimadoBRL({ input_tokens: 1_000_000, output_tokens: 100_000 }, "claude-sonnet-5-5", 5)).toBe(22.5);
    // Leitura de cache custa 10% da entrada.
    expect(custoEstimadoBRL({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000 }, "claude-sonnet-5-5", 5)).toBe(1.5);
  });

  it("lê teto e cotação do ambiente com padrão", () => {
    expect(numeroDoAmbiente("80", 50)).toBe(80);
    expect(numeroDoAmbiente("12,5", 50)).toBe(12.5);
    expect(numeroDoAmbiente("", 50)).toBe(50);
    expect(numeroDoAmbiente(undefined, 50)).toBe(50);
    expect(numeroDoAmbiente("abc", 50)).toBe(50);
    expect(tetoAtingido(50, 50)).toBe(true);
    expect(tetoAtingido(49.99, 50)).toBe(false);
  });

  it("começa o mês no fuso de São Paulo", () => {
    // 1º de março, 01:00 UTC ainda é 28 de fevereiro em São Paulo.
    expect(inicioDoMes(new Date("2026-03-01T01:00:00Z")).toISOString()).toBe("2026-02-01T03:00:00.000Z");
    expect(inicioDoMes(new Date("2026-11-17T15:00:00Z")).toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it("monta o Markdown do relatório e do plano com todas as seções", () => {
    const rel = relatorioMarkdown(base, "Padaria Exemplo");
    expect(rel).toContain("# Relatório do lead — Padaria Exemplo");
    for (const s of ["Resumo executivo", "Diagnóstico da situação atual", "Oportunidade", "Riscos", "Recomendação"]) expect(rel).toContain(s);
    expect(rel).toContain("| Risco | Probabilidade | Impacto | Mitigação |");
    expect(rel).toContain("| Média | Alta |");
    const plano = planoMarkdown(base, "Padaria Exemplo");
    for (const s of ["Requisitos", "Fluxos", "Regras de negócio", "Normas e conformidade", "Metodologia", "Critérios de aceite"]) expect(plano).toContain(s);
    expect(plano).toContain("## 10. Passos de implementação (≈ 25 h)");
    expect(plano).toContain("| RF01 |");
  });

  it("escapa barra vertical nas tabelas", () => {
    const c = { ...base, plano: { ...base.plano, normas: [{ norma: "A | B", aplicacao: "x" }] } };
    expect(planoMarkdown(c, "X")).toContain("| A / B | x |");
  });

  it("monta o exemplo com as respostas do diagnóstico (sem chave da API)", () => {
    const c = exemploRelatorioPlano({
      nome: "Oficina Exemplo",
      segmento: "Oficina",
      pontuacao: 40,
      veredito: "frio",
      respostas: {
        tarefas: [{ nome: "Enviar orçamentos", peso: 3 }, { nome: "Agendar clientes", peso: 1 }],
        reclamacoes: ["Perde mensagens"],
        numeros: { horasSemana: "10", custoHora: "20" },
        notas: { dor: 5, orcamento: 1, urgencia: 3, decisor: 2, abertura: 4 },
      },
    });
    expect(esquemaPlanoIA.safeParse(c).success).toBe(true);
    expect(c.relatorio.diagnosticoAtual.processosAtuais[0]).toContain("Enviar orçamentos");
    expect(c.relatorio.oportunidade.economiaEstimada).toContain("866");
    expect(c.relatorio.riscos[0]!.probabilidade).toBe("alta");
    expect(c.relatorio.recomendacao).toContain("Não seguir agora");
    expect(c.relatorio.premissas.join(" ")).not.toContain("não informad");
  });

  it("gera nome de arquivo sem acento nem espaço", () => {
    expect(nomeArquivo("plano", "Ótica Vista Clara (exemplo)")).toBe("plano-otica-vista-clara-exemplo.md");
  });
});
