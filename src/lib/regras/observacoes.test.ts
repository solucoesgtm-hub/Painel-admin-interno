import { describe, expect, it } from "vitest";
import { filtrarObservacoes } from "./observacoes";

describe("observações do diagnóstico", () => {
  it("encontra os temas por palavra-chave, sem acento e sem diferenciar maiúsculas", () => {
    const r = filtrarObservacoes(
      "Dona Ana responde tudo pelo WhatsApp e anota os pedidos no caderno. Acha caro, precisa conversar com o sócio. Quer começar essa semana!",
    );
    expect(r?.palavrasChave).toEqual(["WhatsApp", "Vendas e pedidos", "Planilhas e papel", "Preço", "Urgência", "Decisor"]);
    expect(r?.destaques).toHaveLength(3);
  });

  it("só considera a palavra inteira (caro não casa com carona)", () => {
    expect(filtrarObservacoes("Veio de carona até a loja.")?.palavrasChave).toEqual([]);
    expect(filtrarObservacoes("Achou o valor caro.")?.palavrasChave).toEqual(["Preço"]);
  });

  it("aceita plural simples e acentos", () => {
    expect(filtrarObservacoes("Muitas cobranças atrasadas no PIX")?.palavrasChave).toEqual(["Pagamentos"]);
    expect(filtrarObservacoes("Agendamentos por telefone")?.palavrasChave).toEqual(["Agendamento"]);
  });

  it("texto vazio não gera observação", () => {
    expect(filtrarObservacoes("   ")).toBeNull();
    expect(filtrarObservacoes(undefined)).toBeNull();
  });
});
