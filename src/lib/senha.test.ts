import { describe, expect, it } from "vitest";
import { conferirSenha, gerarHash, gerarSenhaTemporaria, validarForcaSenha } from "./senha";

describe("senha", () => {
  it("confere a senha certa e recusa a errada", async () => {
    const hash = await gerarHash("exemplo-teste-123");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await conferirSenha("exemplo-teste-123", hash)).toBe(true);
    expect(await conferirSenha("exemplo-teste-124", hash)).toBe(false);
  });

  it("gera hashes diferentes para a mesma senha (sal aleatório)", async () => {
    expect(await gerarHash("exemplo-teste-123")).not.toBe(await gerarHash("exemplo-teste-123"));
  });

  it("recusa hash ausente ou malformado", async () => {
    expect(await conferirSenha("qualquer", null)).toBe(false);
    expect(await conferirSenha("qualquer", "texto-puro")).toBe(false);
  });

  it("exige tamanho mínimo, letras e números", () => {
    expect(validarForcaSenha("curta1")).not.toBeNull();
    expect(validarForcaSenha("somenteletras")).not.toBeNull();
    expect(validarForcaSenha("letras12345")).toBeNull();
  });

  it("gera senha temporária que passa na validação", () => {
    for (let i = 0; i < 20; i++) expect(validarForcaSenha(gerarSenhaTemporaria())).toBeNull();
  });
});
