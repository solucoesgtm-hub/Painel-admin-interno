import { describe, expect, it } from "vitest";
import { contarMarcadores, esquemaIdeia, faltamOpinar, ordenarIdeias, pontuacaoIdeia, type Ideia } from "./ideias";

const ideia = (p: Partial<Ideia>): Ideia => ({
  id: "i",
  autorId: "a",
  titulo: "Ideia",
  texto: "",
  situacao: "aberta",
  criadoEm: "2026-11-01T10:00:00Z",
  finalizadaEm: null,
  finalizadaPor: null,
  marcadores: [],
  ...p,
});

describe("ideias", () => {
  it("valida título e texto", () => {
    expect(esquemaIdeia.safeParse({ titulo: "ab" }).success).toBe(false);
    expect(esquemaIdeia.parse({ titulo: "  Chatbot para pet shops " })).toEqual({ titulo: "Chatbot para pet shops", texto: "" });
  });

  it("conta marcadores, pontua e mostra quem falta opinar", () => {
    const m: Ideia["marcadores"] = [
      { socioId: "b", marcador: "genial" },
      { socioId: "c", marcador: "nao_curti" },
    ];
    expect(contarMarcadores(m)).toEqual({ gostei: 0, genial: 1, pode_melhorar: 0, nao_curti: 1 });
    expect(pontuacaoIdeia(m)).toBe(1);
    expect(faltamOpinar(ideia({ marcadores: [m[0]!] }), ["a", "b", "c"])).toEqual(["c"]);
  });

  it("ordena por recentes ou pelas mais bem avaliadas", () => {
    const x = ideia({ id: "x", criadoEm: "2026-11-10T00:00:00Z", marcadores: [{ socioId: "b", marcador: "nao_curti" }] });
    const y = ideia({ id: "y", criadoEm: "2026-11-01T00:00:00Z", marcadores: [{ socioId: "b", marcador: "genial" }] });
    expect(ordenarIdeias([y, x], "recentes").map((i) => i.id)).toEqual(["x", "y"]);
    expect(ordenarIdeias([x, y], "melhores").map((i) => i.id)).toEqual(["y", "x"]);
  });
});
