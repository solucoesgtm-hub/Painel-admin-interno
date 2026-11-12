import { describe, expect, it } from "vitest";
import { esquemaMoverEtapa, esquemaNovoLead, estaParado } from "./funil";
import { calcularPontuacao, complexidade, economia, PESOS_PADRAO, veredito } from "./pontuacao";
import { limiteMei, situacaoMei } from "./mei";
import { conciliaAutomatico, dividirEntreSocios, situacaoMensalidade } from "./financeiro";
import { normalizarMarcacao, vereditoEdital, type Requisito } from "./editais";

describe("funil", () => {
  it("marca como parado só depois de 7 dias e fora de manutenção/perdido", () => {
    const agora = new Date("2026-11-12T12:00:00Z");
    expect(estaParado("visita", "2026-11-04T11:00:00Z", agora)).toBe(true);
    expect(estaParado("visita", "2026-11-06T12:00:00Z", agora)).toBe(false);
    expect(estaParado("manutencao", "2026-01-01T00:00:00Z", agora)).toBe(false);
  });

  it("não aceita lead sem dono, próximo passo e data", () => {
    const r = esquemaNovoLead.safeParse({ nome: "Exemplo", donoId: "", proximoPasso: "", proximoPassoData: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const campos = r.error.issues.map((i) => i.path[0]);
      expect(campos).toEqual(expect.arrayContaining(["donoId", "proximoPasso", "proximoPassoData"]));
    }
  });

  it("exige motivo ao marcar como perdido", () => {
    expect(esquemaMoverEtapa.safeParse({ leadId: "1", etapa: "perdido" }).success).toBe(false);
    expect(esquemaMoverEtapa.safeParse({ leadId: "1", etapa: "perdido", motivoPerda: "Preço" }).success).toBe(true);
    expect(esquemaMoverEtapa.safeParse({ leadId: "1", etapa: "visita" }).success).toBe(true);
  });
});

describe("pontuação", () => {
  it("vai de 0 a 100", () => {
    const zero = { dor: 0, orcamento: 0, urgencia: 0, decisor: 0, abertura: 0 };
    const cheio = { dor: 5, orcamento: 5, urgencia: 5, decisor: 5, abertura: 5 };
    expect(calcularPontuacao(zero)).toBe(0);
    expect(calcularPontuacao(cheio)).toBe(100);
  });

  it("respeita os pesos", () => {
    const soDor = { dor: 5, orcamento: 0, urgencia: 0, decisor: 0, abertura: 0 };
    expect(calcularPontuacao(soDor, PESOS_PADRAO)).toBe(30);
  });

  it("classifica o veredito", () => {
    expect(veredito(70)).toBe("quente");
    expect(veredito(69)).toBe("morno");
    expect(veredito(44)).toBe("frio");
  });

  it("estima complexidade e economia", () => {
    expect(complexidade([{ peso: 1 }], 0)).toBe("baixa");
    expect(complexidade([{ peso: 3 }, { peso: 3 }], 3)).toBe("alta");
    expect(economia(10, 25).semanal).toBe(250);
    expect(economia(10, 25).anual).toBe(13000);
  });
});

describe("MEI", () => {
  it("usa limite proporcional no ano de abertura", () => {
    expect(limiteMei(2026, new Date(2026, 6, 1), 81000)).toBe(81000 / 12 * 6);
    expect(limiteMei(2027, new Date(2026, 6, 1), 81000)).toBe(81000);
  });
  it("alerta a partir de 80%", () => {
    expect(situacaoMei(64000, 81000).nivel).toBe("ok");
    expect(situacaoMei(65000, 81000).nivel).toBe("alerta");
    expect(situacaoMei(82000, 81000).nivel).toBe("estourado");
  });
});

describe("financeiro", () => {
  it("define a situação da mensalidade", () => {
    expect(situacaoMensalidade("2026-11-10", null, "2026-11-12")).toBe("atrasado");
    expect(situacaoMensalidade("2026-11-15", null, "2026-11-12")).toBe("a_vencer");
    expect(situacaoMensalidade("2026-11-10", "2026-11-09", "2026-11-12")).toBe("pago");
  });
  it("concilia quando valor e pagador batem", () => {
    expect(conciliaAutomatico({ valor: 290, pagadorNome: "Padaria São José" }, { valor: 290, clienteNome: "padaria sao jose" })).toBe(true);
    expect(conciliaAutomatico({ valor: 291, pagadorNome: "Padaria São José" }, { valor: 290, clienteNome: "Padaria São José" })).toBe(false);
  });
  it("divide sem perder centavos", () => {
    const partes = dividirEntreSocios(100, 3);
    expect(partes).toEqual([33.34, 33.33, 33.33]);
    expect(partes.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });
});

describe("editais", () => {
  const base: Requisito = { id: "1", texto: "Ser MEI", eliminatorio: true, marcacao: "atende", pagina: 4, trecho: "Podem participar MEI" };
  it("sem página citada vira Verificar", () => {
    expect(normalizarMarcacao({ ...base, pagina: null })).toBe("verificar");
  });
  it("calcula o veredito", () => {
    expect(vereditoEdital([base]).tipo).toBe("apto");
    expect(vereditoEdital([base, { ...base, id: "2", eliminatorio: false, marcacao: "verificar" }]).tipo).toBe("apto_com_ajustes");
    expect(vereditoEdital([{ ...base, marcacao: "nao_atende" }]).tipo).toBe("nao_apto");
  });
});
