import { describe, expect, it } from "vitest";
import { exemploCodigo, exemploRelatorioPlano } from "../ia/exemplo";
import {
  codigoMarkdown,
  custoEstimadoBRL,
  esquemaCodigo,
  esquemaPedidoPlano,
  esquemaPlanoIA,
  esquemaRelatorioPlano,
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
  it("o exemplo da demonstração passa nos esquemas das duas etapas", () => {
    expect(esquemaRelatorioPlano.safeParse(base).success).toBe(true);
    expect(esquemaCodigo.safeParse({ codigo: exemploCodigo() }).success).toBe(true);
    expect(esquemaPlanoIA.safeParse({ ...base, codigo: exemploCodigo() }).success).toBe(true);
  });

  it("recusa resposta sem o plano", () => {
    expect(esquemaRelatorioPlano.safeParse({ relatorio: base.relatorio }).success).toBe(false);
  });

  it("valida o pedido das duas etapas", () => {
    expect(esquemaPedidoPlano.safeParse({ etapa: "plano", leadId: "l-1" }).success).toBe(true);
    expect(esquemaPedidoPlano.safeParse({ etapa: "codigo", leadId: "l-1", planoId: "p" }).success).toBe(true);
    expect(esquemaPedidoPlano.safeParse({ etapa: "codigo", leadId: "l-1" }).success).toBe(false);
    expect(esquemaPedidoPlano.safeParse({ etapa: "outra", leadId: "l-1" }).success).toBe(false);
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

  it("monta o Markdown das três abas", () => {
    const c = { ...base, codigo: exemploCodigo() };
    expect(relatorioMarkdown(c, "Padaria Exemplo")).toContain("# Relatório do lead — Padaria Exemplo");
    const plano = planoMarkdown(c, "Padaria Exemplo");
    expect(plano).toContain("## Passos de implementação (≈ 25 h)");
    expect(plano).toContain("| Camada | Tecnologia | Motivo |");
    const codigo = codigoMarkdown(c, "Padaria Exemplo");
    expect(codigo).toContain("## `src/db/schema.ts`");
    expect(codigoMarkdown(base, "X")).toContain("Ainda não gerado");
  });

  it("usa cerca mais longa que as crases do arquivo", () => {
    const c = { ...base, codigo: { instrucoes: "", arquivos: [{ caminho: "a.md", linguagem: "md", descricao: "", conteudo: "```js\nx\n```" }] } };
    expect(codigoMarkdown(c, "X")).toContain("````md");
  });

  it("gera nome de arquivo sem acento nem espaço", () => {
    expect(nomeArquivo("plano", "Ótica Vista Clara (exemplo)")).toBe("plano-otica-vista-clara-exemplo.md");
  });
});
