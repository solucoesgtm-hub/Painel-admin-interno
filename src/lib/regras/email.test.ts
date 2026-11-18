import { describe, expect, it } from "vitest";
import { assuntoResposta, ordenarTriagem, separarRemetente, triagemPorRegras, type EmailResumo } from "./email";

const email = (p: Partial<EmailResumo>): EmailResumo => ({
  id: "m1",
  conversaId: "t1",
  de: "teste@exemplo.com",
  nomeDe: "",
  assunto: "",
  trecho: "",
  recebidoEm: "2026-11-17T12:00:00Z",
  lido: false,
  ...p,
});

describe("triagem por regras", () => {
  it("reconhece um possível cliente e sugere resposta", () => {
    const t = triagemPorRegras(email({ nomeDe: "Ana Souza", assunto: "Orçamento de atendente no WhatsApp" }));
    expect(t.categoria).toBe("lead");
    expect(t.urgencia).toBe("alta");
    expect(t.respostaSugerida).toContain("Ana");
  });

  it("separa financeiro e edital, sem resposta automática", () => {
    expect(triagemPorRegras(email({ assunto: "Boleto disponível" })).categoria).toBe("financeiro");
    const ed = triagemPorRegras(email({ assunto: "Nova chamada pública FAPES" }));
    expect(ed.categoria).toBe("edital");
    expect(ed.respostaSugerida).toBeNull();
  });

  it("promoção é sempre baixa urgência", () => {
    const t = triagemPorRegras(email({ de: "noreply@loja.com", assunto: "Desconto urgente só hoje" }));
    expect(t.categoria).toBe("promocao");
    expect(t.urgencia).toBe("baixa");
  });
});

describe("utilidades de e-mail", () => {
  it("separa nome e e-mail do remetente", () => {
    expect(separarRemetente('"Ana Souza" <ana@x.com>')).toEqual({ nome: "Ana Souza", email: "ana@x.com" });
    expect(separarRemetente("ana@x.com")).toEqual({ nome: "", email: "ana@x.com" });
  });

  it("não repete o Re:", () => {
    expect(assuntoResposta("Oi")).toBe("Re: Oi");
    expect(assuntoResposta("RE: Oi")).toBe("RE: Oi");
  });

  it("ordena por urgência e depois pelo mais recente", () => {
    const r = ordenarTriagem([
      { id: "a", urgencia: "baixa" as const, recebidoEm: "2026-11-17" },
      { id: "b", urgencia: "alta" as const, recebidoEm: "2026-11-15" },
      { id: "c", urgencia: "alta" as const, recebidoEm: "2026-11-16" },
    ]);
    expect(r.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
});
