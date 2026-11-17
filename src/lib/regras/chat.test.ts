import { describe, expect, it } from "vitest";
import { continuaBloco, esquemaMensagem, juntarMensagens, loginBloqueado, partesComLinks, podeApagar, proximoIntervalo, semUsoHaMuito, TAMANHO_MAX_MENSAGEM } from "./chat";

describe("chat interno", () => {
  it("limpa a mensagem e recusa vazia ou longa demais", () => {
    const r = esquemaMensagem.safeParse({ texto: "  oi\r\n\n\n\n\n\ntudo bem?  " });
    expect(r.success && r.data.texto).toBe("oi\n\n\ntudo bem?");
    expect(esquemaMensagem.safeParse({ texto: "   \n " }).success).toBe(false);
    expect(esquemaMensagem.safeParse({ texto: "a".repeat(TAMANHO_MAX_MENSAGEM + 1) }).success).toBe(false);
  });

  it("só o autor apaga, e só por 15 minutos", () => {
    const m = { autorId: "a", apagada: false, em: "2026-11-16T12:00:00Z" };
    expect(podeApagar(m, "a", new Date("2026-11-16T12:10:00Z"))).toBe(true);
    expect(podeApagar(m, "a", new Date("2026-11-16T12:16:00Z"))).toBe(false);
    expect(podeApagar(m, "b", new Date("2026-11-16T12:01:00Z"))).toBe(false);
    expect(podeApagar({ ...m, apagada: true }, "a", new Date("2026-11-16T12:01:00Z"))).toBe(false);
  });

  it("agrupa mensagens seguidas do mesmo autor", () => {
    const a = { autorId: "a", em: "2026-11-16T12:00:00Z" };
    expect(continuaBloco(a, { autorId: "a", em: "2026-11-16T12:03:00Z" })).toBe(true);
    expect(continuaBloco(a, { autorId: "a", em: "2026-11-16T12:06:00Z" })).toBe(false);
    expect(continuaBloco(a, { autorId: "b", em: "2026-11-16T12:01:00Z" })).toBe(false);
    expect(continuaBloco(undefined, a)).toBe(false);
  });

  it("separa links sem levar a pontuação final e ignora outros esquemas", () => {
    expect(partesComLinks("veja https://exemplo.test/a?b=1, depois")).toEqual([
      { tipo: "texto", valor: "veja " },
      { tipo: "link", valor: "https://exemplo.test/a?b=1" },
      { tipo: "texto", valor: ", depois" },
    ]);
    expect(partesComLinks("javascript:alert(1)")).toEqual([{ tipo: "texto", valor: "javascript:alert(1)" }]);
  });
});

describe("bloqueio de login", () => {
  it("bloqueia a partir da 5ª tentativa recusada na janela", () => {
    expect(loginBloqueado(4)).toBe(false);
    expect(loginBloqueado(5)).toBe(true);
  });
});

describe("atualização do chat", () => {
  it("espaça as consultas sem novidade e volta a 4 s quando chega mensagem", () => {
    expect(proximoIntervalo(4000, false)).toBe(6000);
    expect(proximoIntervalo(24000, false)).toBe(30000);
    expect(proximoIntervalo(30000, false)).toBe(30000);
    expect(proximoIntervalo(30000, true)).toBe(4000);
  });

  it("pausa depois de 15 minutos sem uso", () => {
    const agora = 1_000_000_000;
    expect(semUsoHaMuito(agora - 14 * 60_000, agora)).toBe(false);
    expect(semUsoHaMuito(agora - 15 * 60_000, agora)).toBe(true);
  });

  it("junta mudanças substituindo pelo id e ordenando por data", () => {
    const a = [{ id: "1", em: "2026-11-17T10:00:00Z", t: "oi" }, { id: "2", em: "2026-11-17T10:01:00Z", t: "x" }];
    const r = juntarMensagens(a, [{ id: "2", em: "2026-11-17T10:01:00Z", t: "" }, { id: "3", em: "2026-11-17T10:00:30Z", t: "novo" }]);
    expect(r.map((m) => m.id + m.t)).toEqual(["1oi", "3novo", "2"]);
    expect(juntarMensagens(a, [])).toBe(a);
  });
});
