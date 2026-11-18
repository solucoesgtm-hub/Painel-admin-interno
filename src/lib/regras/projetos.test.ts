import { describe, expect, it } from "vitest";
import { esquemaProjeto, linkRepositorio, ordenarProjetos } from "./projetos";

describe("projetos", () => {
  const base = { nome: "Atendente", cliente: "Padaria Pão Bom", leadId: "", situacao: "planejado", donoId: "", prazo: "2026-12-01", repositorio: "", descricao: "" };

  it("aceita o formulário com campos opcionais vazios (viram nulo)", () => {
    const r = esquemaProjeto.parse(base);
    expect(r.leadId).toBeNull();
    expect(r.donoId).toBeNull();
  });

  it("recusa nome curto, prazo vazio e repositório inválido", () => {
    const r = esquemaProjeto.safeParse({ ...base, nome: "A", prazo: "", repositorio: "não é link" });
    expect(r.success).toBe(false);
    const campos = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(campos).toEqual(expect.arrayContaining(["nome", "prazo", "repositorio"]));
  });

  it("completa o https do repositório", () => {
    expect(linkRepositorio("github.com/gtm/x")).toBe("https://github.com/gtm/x");
    expect(linkRepositorio("https://gitlab.com/x")).toBe("https://gitlab.com/x");
    expect(linkRepositorio("")).toBe("");
  });

  it("em aberto primeiro por prazo, pausados depois, entregues por último", () => {
    const r = ordenarProjetos([
      { id: "a", situacao: "entregue" as const, prazo: "2026-01-01" },
      { id: "b", situacao: "em_andamento" as const, prazo: "2026-12-01" },
      { id: "c", situacao: "pausado" as const, prazo: "2026-02-01" },
      { id: "d", situacao: "planejado" as const, prazo: "2026-11-01" },
    ]);
    expect(r.map((x) => x.id)).toEqual(["d", "b", "c", "a"]);
  });
});
