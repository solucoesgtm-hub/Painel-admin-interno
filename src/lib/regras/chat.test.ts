import { describe, expect, it } from "vitest";
import { avisoDeMensagem, servicoPushPermitido, continuaBloco, deveGravarVisto, esquemaMensagem, estaOnline, juntarMensagens, textoVisto, loginBloqueado, partesComLinks, podeApagar, proximoIntervalo, semUsoHaMuito, TAMANHO_MAX_MENSAGEM } from "./chat";

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

describe("presença", () => {
  const agora = new Date("2026-11-17T15:00:00-03:00");
  const antes = (min: number) => new Date(agora.getTime() - min * 60_000).toISOString();

  it("online por 3 minutos depois do último uso", () => {
    expect(estaOnline(antes(2), agora)).toBe(true);
    expect(estaOnline(antes(4), agora)).toBe(false);
    expect(estaOnline(null, agora)).toBe(false);
  });

  it("grava visto no máximo uma vez por minuto", () => {
    expect(deveGravarVisto(null, agora)).toBe(true);
    expect(deveGravarVisto(antes(0.5), agora)).toBe(false);
    expect(deveGravarVisto(antes(1), agora)).toBe(true);
  });

  it("descreve o último acesso em português, no fuso de São Paulo", () => {
    expect(textoVisto(antes(1), agora)).toBe("Online agora");
    expect(textoVisto(antes(12), agora)).toBe("Visto há 12 min");
    expect(textoVisto("2026-11-17T09:05:00-03:00", agora)).toBe("Visto hoje às 09:05");
    expect(textoVisto("2026-11-16T18:40:00-03:00", agora)).toBe("Visto ontem às 18:40");
    expect(textoVisto("2026-11-03T09:10:00-03:00", agora)).toBe("Visto em 03/11 às 09:10");
    expect(textoVisto(null, agora)).toBe("Ainda não acessou");
  });
});

describe("notificações", () => {
  it("aceita só serviços oficiais de push em https", () => {
    expect(servicoPushPermitido("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(servicoPushPermitido("https://web.push.apple.com/QGx")).toBe(true);
    expect(servicoPushPermitido("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(servicoPushPermitido("https://wns2-bl2p.notify.windows.com/w/?token=x")).toBe(true);
    expect(servicoPushPermitido("http://fcm.googleapis.com/x")).toBe(false);
    expect(servicoPushPermitido("https://fcm.googleapis.com.evil.test/x")).toBe(false);
    expect(servicoPushPermitido("https://localhost/x")).toBe(false);
  });

  it("resume a mensagem no aviso", () => {
    const a = avisoDeMensagem("Thalis", "  oi\n\ntudo   bem?  ", 2);
    expect(a).toEqual({ titulo: "Thalis · Chat GTM", texto: "oi tudo bem?", url: "/chat", naoLidas: 2 });
    expect(avisoDeMensagem("M", "x".repeat(200), 1).texto).toHaveLength(138);
  });
});
