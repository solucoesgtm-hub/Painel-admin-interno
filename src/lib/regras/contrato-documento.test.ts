import { describe, expect, it } from "vitest";
import { contratoParaHtml, esquemaDocumento, faltandoContratada, formatarDocumento, mesesDeVigencia, montarContrato } from "./contrato-documento";

const gtm = { razaoSocial: "GTM Soluções LTDA", nomeFantasia: "GTM", cnpj: "00000000000191", endereco: "Rua A, 10", municipio: "Marilândia/ES", titular: "Gabriel", email: "" };
const base = {
  contratanteNome: "Padaria Pão Bom",
  contratanteDocumento: "11.222.333/0001-81",
  contratanteEndereco: "Av. B, 20, Colatina/ES",
  contratanteRepresentante: "Maria Souza",
  contratanteEmail: "",
  produto: "Atendente WhatsApp",
  escopo: "Atendimento automático.\n- Respostas 24h\n- Pedidos pelo WhatsApp",
  prazoImplantacaoDias: "15",
  valorImplantacao: "1900",
  parcelasImplantacao: "2",
  valorMensal: "290",
  diaVencimento: "10",
  formaPagamento: "Pix",
  inicio: "2026-12-01",
  fim: "2027-11-30",
  cidadeAssinatura: "Marilândia",
  dataAssinatura: "2026-11-20",
  clausulasExtras: "",
};

describe("documento do contrato", () => {
  it("valida CPF/CNPJ pelo tamanho e datas em ordem", () => {
    expect(esquemaDocumento.safeParse(base).success).toBe(true);
    expect(esquemaDocumento.safeParse({ ...base, contratanteDocumento: "123" }).success).toBe(false);
    expect(esquemaDocumento.safeParse({ ...base, fim: "2026-11-01" }).success).toBe(false);
  });

  it("formata documento e conta meses de vigência", () => {
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarDocumento("12345678901")).toBe("123.456.789-01");
    expect(mesesDeVigencia("2026-01-15", "2027-01-14")).toBe(12);
    expect(mesesDeVigencia("2026-01-01", "2026-12-31")).toBe(12);
    expect(mesesDeVigencia("2026-03-01", "2026-05-31")).toBe(3);
  });

  it("monta o texto com os campos variáveis do cliente", () => {
    const md = montarContrato(esquemaDocumento.parse(base), gtm);
    expect(md).toContain("**CONTRATANTE:** Padaria Pão Bom, inscrito(a) no CNPJ sob o nº 11.222.333/0001-81");
    expect(md).toContain("**Atendente WhatsApp**");
    expect(md).toContain("- Respostas 24h");
    expect(md).toContain("em 2 parcelas mensais e iguais de R$");
    expect(md).toContain("todo dia 10 de cada mês, por Pix");
    expect(md).toContain("(12 meses)");
    expect(md).toContain("Cláusula 7ª — Foro");
    const extra = montarContrato(esquemaDocumento.parse({ ...base, clausulasExtras: "Inclui 2 visitas por mês." }), gtm);
    expect(extra).toContain("Cláusula 7ª — Condições específicas");
    expect(extra).toContain("Cláusula 8ª — Foro");
  });

  it("aponta o que falta em Nossa empresa", () => {
    expect(faltandoContratada({ ...gtm, cnpj: "", titular: "" })).toEqual(["CNPJ", "titular"]);
  });

  it("HTML escapa o texto antes de formatar", () => {
    expect(contratoParaHtml("**<b>x</b>**\n- item")).toBe("<p><strong>&lt;b&gt;x&lt;/b&gt;</strong></p>\n<ul>\n<li>item</li>\n</ul>");
  });
});
