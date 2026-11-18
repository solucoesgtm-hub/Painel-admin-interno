import { describe, expect, it } from "vitest";
import { agruparLembretes, esquemaItem, filtrarLembretes, normalizarAssunto, resumoLembretes, situacaoPrazo, type Lembrete } from "./lembretes";

const item = (p: Partial<Lembrete>): Lembrete => ({
  id: Math.random().toString(36).slice(2),
  projetoId: null,
  tipo: "lembrete",
  assunto: null,
  prazo: null,
  responsavelId: null,
  texto: "Algo",
  feito: false,
  feitoEm: null,
  feitoPor: null,
  criadoEm: "2026-11-01T12:00:00Z",
  ...p,
});

const HOJE = "2026-11-18";

describe("validação do novo item", () => {
  it("sem vínculo ignora projeto e assunto preenchidos", () => {
    const r = esquemaItem.parse({ texto: "Pagar DAS", vinculo: "nenhum", projetoId: "p1", assunto: "Fin" });
    expect(r).toMatchObject({ texto: "Pagar DAS", tipo: "lembrete", projetoId: null, assunto: null, prazo: null, responsavelId: null });
  });
  it("projeto exige o projeto; assunto exige o assunto", () => {
    expect(esquemaItem.safeParse({ texto: "x y", vinculo: "projeto" }).success).toBe(false);
    expect(esquemaItem.safeParse({ texto: "x y", vinculo: "assunto", assunto: "" }).success).toBe(false);
  });
  it("normaliza o assunto e aceita tarefa com prazo e responsável", () => {
    const r = esquemaItem.parse({ texto: "Enviar NF", tipo: "tarefa", vinculo: "assunto", assunto: "  financeiro ", prazo: "2026-11-20", responsavelId: "s1" });
    expect(r).toMatchObject({ tipo: "tarefa", assunto: "Financeiro", prazo: "2026-11-20", responsavelId: "s1" });
  });
  it("assunto: espaços e maiúscula", () => expect(normalizarAssunto("  marketing   digital ")).toBe("Marketing digital"));
});

describe("prazos", () => {
  it("classifica atrasado, hoje, em breve e depois; feito não tem situação", () => {
    expect(situacaoPrazo({ feito: false, prazo: "2026-11-17" }, HOJE)).toBe("atrasado");
    expect(situacaoPrazo({ feito: false, prazo: HOJE }, HOJE)).toBe("hoje");
    expect(situacaoPrazo({ feito: false, prazo: "2026-11-21" }, HOJE)).toBe("em_breve");
    expect(situacaoPrazo({ feito: false, prazo: "2026-11-30" }, HOJE)).toBe("depois");
    expect(situacaoPrazo({ feito: true, prazo: "2026-11-01" }, HOJE)).toBeNull();
    expect(situacaoPrazo({ feito: false, prazo: null }, HOJE)).toBeNull();
  });
  it("resumo conta abertos, tarefas, atrasados e para hoje", () => {
    const r = resumoLembretes(
      [item({ tipo: "tarefa", prazo: "2026-11-10" }), item({ prazo: HOJE }), item({ feito: true, prazo: "2026-11-01" }), item({})],
      HOJE,
    );
    expect(r).toMatchObject({ abertos: 3, tarefas: 1, atrasados: 1, paraHoje: 1 });
  });
});

describe("grupos e filtros", () => {
  const itens = [
    item({ id: "a", texto: "Solto" }),
    item({ id: "b", assunto: "Financeiro", prazo: "2026-11-25" }),
    item({ id: "c", assunto: "financeiro", prazo: "2026-11-19" }),
    item({ id: "d", assunto: "Editais", feito: true }),
    item({ id: "e", projetoId: "p1", tipo: "tarefa", responsavelId: "eu" }),
  ];

  it("sem vínculo primeiro, assuntos A→Z (sem duplicar por maiúscula), projetos por último", () => {
    const g = agruparLembretes(itens, [{ id: "p1", nome: "Catálogo" }], HOJE);
    expect(g.map((x) => [x.tipo, x.nome, x.itens.map((i) => i.id).join("")])).toEqual([
      ["nenhum", "Sem vínculo", "a"],
      ["assunto", "Editais", "d"],
      ["assunto", "Financeiro", "cb"],
      ["projeto", "Catálogo", "e"],
    ]);
  });

  it("filtra por tipo, responsável e vínculo", () => {
    expect(filtrarLembretes(itens, { tipo: "tarefa", responsavel: "todos", vinculo: "todos" }, "eu").map((i) => i.id)).toEqual(["e"]);
    expect(filtrarLembretes(itens, { tipo: "todos", responsavel: "meus", vinculo: "todos" }, "eu").map((i) => i.id)).toEqual(["e"]);
    expect(filtrarLembretes(itens, { tipo: "todos", responsavel: "todos", vinculo: "assunto" }, "eu").map((i) => i.id)).toEqual(["b", "c", "d"]);
    expect(filtrarLembretes(itens, { tipo: "todos", responsavel: "todos", vinculo: "nenhum" }, "eu").map((i) => i.id)).toEqual(["a"]);
  });
});
