import { describe, expect, it } from "vitest";
import { esquemaMoverEtapa, esquemaNovoLead, estaParado } from "./funil";
import { calcularPontuacao, complexidade, economia, PESOS_PADRAO, veredito } from "./pontuacao";
import { limiteMei, situacaoMei } from "./mei";
import { conciliaAutomatico, dividirEntreSocios, situacaoMensalidade } from "./financeiro";
import { normalizarMarcacao, vereditoEdital, type Requisito } from "./editais";
import { calcularAnalise, type LeadAnalise } from "./analise";
import { esquemaEditarLead } from "./funil";
import { esquemaDiagnostico } from "./pontuacao";
import { camposFaltando, cnpjValido, EMPRESA_VAZIA, esquemaContrato, esquemaEmpresa, estadoContrato, formatarCnpj, resumoContratos } from "./empresa";

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

describe("análise de leads", () => {
  const base: LeadAnalise = { etapa: "lead", etapaDesde: "2026-11-02T12:00:00Z", origem: "Indicação", segmento: "Padaria", motivoPerda: null, pontuacao: null };
  const leads: LeadAnalise[] = [
    base,
    { ...base, etapa: "visita", pontuacao: 50 },
    { ...base, etapa: "fechado", origem: "Instagram", pontuacao: 80 },
    { ...base, etapa: "manutencao", pontuacao: 75 },
    { ...base, etapa: "perdido", motivoPerda: "Preço acima do orçamento", pontuacao: 30, origem: "" },
  ];
  const a = calcularAnalise(leads, new Date("2026-11-12T12:00:00Z"));

  it("conta quem chegou a cada etapa (perdido conta só como lead)", () => {
    expect(a.conversao.map((c) => c.total)).toEqual([5, 3, 2, 2]);
  });
  it("calcula dias na etapa atual", () => {
    expect(a.tempoMedio[0]).toEqual({ etapa: "Lead", dias: 10 });
    expect(a.tempoMedio[2]!.dias).toBe(0);
  });
  it("agrupa origem, motivos e calibração", () => {
    expect(a.origem[0]).toEqual({ origem: "Indicação", total: 3 });
    expect(a.origem).toContainEqual({ origem: "Não informado", total: 1 });
    expect(a.motivosPerda).toEqual([{ motivo: "Preço acima do orçamento", total: 1 }]);
    expect(a.calibracao.map((c) => [c.leads, c.fecharam])).toEqual([[1, 0], [1, 0], [2, 2]]);
  });
  it("não quebra sem leads", () => {
    expect(calcularAnalise([]).conversao.every((c) => c.total === 0)).toBe(true);
  });
});

describe("edição de lead e diagnóstico", () => {
  it("valida os valores da proposta", () => {
    const ok = { leadId: "1", nome: "Exemplo", donoId: "s", proximoPasso: "Ligar", proximoPassoData: "2026-11-20", valorImplantacao: "1900", mensalidade: "290" };
    expect(esquemaEditarLead.safeParse(ok).success).toBe(true);
    expect(esquemaEditarLead.safeParse({ ...ok, mensalidade: "-5" }).success).toBe(false);
    expect(esquemaEditarLead.safeParse({ ...ok, proximoPasso: "" }).success).toBe(false);
  });
  it("recusa nota fora de 0 a 5 e exige o lead", () => {
    const d = { leadId: "1", notas: { dor: 5, orcamento: 4, urgencia: 3, decisor: 2, abertura: 1 }, tarefas: [], ferramentas: [], reclamacoes: [], negocio: { porte: "", tempo: "", atendimento: [] }, numeros: { atendimentosDia: "", horasSemana: "", custoHora: "", ticketMedio: "" } };
    expect(esquemaDiagnostico.safeParse(d).success).toBe(true);
    expect(esquemaDiagnostico.safeParse({ ...d, notas: { ...d.notas, dor: 9 } }).success).toBe(false);
    expect(esquemaDiagnostico.safeParse({ ...d, leadId: "" }).success).toBe(false);
  });
});

describe("nossa empresa", () => {
  it("valida e formata CNPJ", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
    expect(formatarCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("aceita cadastro com campos opcionais vazios e normaliza telefone", () => {
    const r = esquemaEmpresa.safeParse({ ...EMPRESA_VAZIA, razaoSocial: "GTM Soluções (exemplo)", telefone: "27999998888", cnpj: "11222333000181" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.telefone).toBe("(27) 99999-8888");
      expect(r.data.cnpj).toBe("11.222.333/0001-81");
    }
    expect(esquemaEmpresa.safeParse({ ...EMPRESA_VAZIA, razaoSocial: "GTM", email: "sem-arroba" }).success).toBe(false);
  });

  it("aponta o que falta no cadastro", () => {
    expect(camposFaltando({ ...EMPRESA_VAZIA, razaoSocial: "GTM", email: "a@b.test" })).toEqual(["CNPJ", "telefone"]);
  });

  it("classifica contratos e soma a receita mensal só dos vigentes", () => {
    const hoje = "2026-11-13";
    expect(estadoContrato({ situacao: "vigente", fim: "2026-12-10" }, hoje)).toEqual({ tipo: "renovar", dias: 27 });
    expect(estadoContrato({ situacao: "vigente", fim: "2027-06-01" }, hoje)).toEqual({ tipo: "vigente" });
    expect(estadoContrato({ situacao: "vigente", fim: "2026-11-10" }, hoje)).toEqual({ tipo: "vencido", dias: 3 });
    expect(estadoContrato({ situacao: "encerrado", fim: "2026-11-10" }, hoje)).toEqual({ tipo: "encerrado" });
    const r = resumoContratos(
      [
        { situacao: "vigente", fim: "2026-12-10", valorMensal: 290 },
        { situacao: "vigente", fim: "2027-06-01", valorMensal: 340.5 },
        { situacao: "aguardando", fim: "2027-06-01", valorMensal: 450 },
        { situacao: "encerrado", fim: "2026-01-01", valorMensal: 999 },
      ],
      hoje,
    );
    expect(r).toEqual({ vigentes: 2, renovar: 1, aguardando: 1, vencidos: 0, receitaMensal: 630.5 });
  });

  it("não aceita contrato que termina antes de começar", () => {
    const base = { cliente: "Padaria (exemplo)", produto: "Atendente", valorMensal: 290, valorImplantacao: 0, situacao: "vigente", observacoes: "" };
    expect(esquemaContrato.safeParse({ ...base, inicio: "2026-11-01", fim: "2027-11-01" }).success).toBe(true);
    expect(esquemaContrato.safeParse({ ...base, inicio: "2026-11-01", fim: "2026-10-01" }).success).toBe(false);
  });
});
