import { describe, expect, it } from "vitest";
import { categoriaSaida, citaCliente, conciliar, mensalidadesDoMes, planilhaContador, serieMensal, type LancamentoBanco } from "./financeiro";

const lanc = (p: Partial<LancamentoBanco>): LancamentoBanco => ({
  id: "l",
  data: "2026-11-10",
  descricao: "",
  valor: 0,
  tipo: "entrada",
  conciliadoCom: null,
  ...p,
});

describe("mensalidades a partir dos contratos", () => {
  const base = { id: "c1", cliente: "Padaria Pão Bom", produto: "Atendente", inicio: "2026-03-15", fim: "2027-03-14", valorMensal: 290, situacao: "vigente" };

  it("gera a cobrança do mês no dia do início", () => {
    expect(mensalidadesDoMes([base], "2026-11-17")).toEqual([
      { id: "c1-2026-11", cliente: "Padaria Pão Bom", produto: "Atendente", valor: 290, vencimento: "2026-11-15", pagoEm: null },
    ]);
  });

  it("ignora contrato aguardando, sem mensalidade ou fora da vigência", () => {
    expect(mensalidadesDoMes([{ ...base, situacao: "aguardando" }, { ...base, valorMensal: 0 }, { ...base, fim: "2026-10-31" }], "2026-11-17")).toEqual([]);
  });

  it("dia 31 vira o último dia de meses curtos", () => {
    expect(mensalidadesDoMes([{ ...base, inicio: "2026-01-31" }], "2027-02-10")[0]!.vencimento).toBe("2027-02-28");
  });
});

describe("conciliação automática", () => {
  const cobranca = { id: "m1", cliente: "Padaria São José (exemplo)", produto: "Atendente", valor: 290, vencimento: "2026-11-10", pagoEm: null };

  it("liga entrada com valor e nome e marca a mensalidade como paga", () => {
    const r = conciliar([lanc({ id: "e1", descricao: "PIX RECEBIDO - PADARIA SAO JOSE LTDA", valor: 290, data: "2026-11-09" })], [cobranca]);
    expect(r.lancamentos[0]!.conciliadoCom).toContain("Padaria São José");
    expect(r.cobrancas[0]!.pagoEm).toBe("2026-11-09");
  });

  it("não concilia com valor diferente nem usa a mesma entrada duas vezes", () => {
    expect(conciliar([lanc({ descricao: "Pix Padaria Sao Jose", valor: 291 })], [cobranca]).cobrancas[0]!.pagoEm).toBeNull();
    const r = conciliar([lanc({ descricao: "Pix Padaria Sao Jose", valor: 290 })], [cobranca, { ...cobranca, id: "m2" }]);
    expect(r.cobrancas.filter((c) => c.pagoEm).length).toBe(1);
  });

  it("palavras genéricas não bastam para citar o cliente", () => {
    expect(citaCliente("Pix recebido de Maria", "Clínica (exemplo) Ltda")).toBe(false);
  });
});

describe("extrato", () => {
  it("categoriza saídas", () => {
    expect(categoriaSaida("DAS MEI 11/2026")).toBe("Impostos");
    expect(categoriaSaida("ANTHROPIC PBC")).toBe("IA");
    expect(categoriaSaida("Posto Shell combustível")).toBe("Deslocamento");
    expect(categoriaSaida("Compra qualquer")).toBe("Outros");
  });

  it("soma por mês, com meses vazios", () => {
    const s = serieMensal([lanc({ valor: 100 }), lanc({ valor: 40, tipo: "saida" }), lanc({ data: "2026-09-02", valor: 10 })], 3, "2026-11-17");
    expect(s.map((x) => [x.mes, x.entradas, x.saidas])).toEqual([
      ["set", 10, 0],
      ["out", 0, 0],
      ["nov", 100, 40],
    ]);
  });

  it("planilha com ponto e vírgula e vírgula decimal", () => {
    const csv = planilhaContador([lanc({ descricao: "Pix; cliente", valor: 1234.5 }), lanc({ data: "2026-11-01", descricao: "DAS", valor: 76.9, tipo: "saida" })]);
    const linhas = csv.split("\r\n");
    expect(linhas[1]).toBe("01/11/2026;Saída;DAS;Impostos;-76,90");
    expect(linhas[2]).toBe('10/11/2026;Entrada;"Pix; cliente";;1234,50');
  });
});
