// Pontuação do diagnóstico: 0 a 100 com cinco fatores e pesos configuráveis.
export type Fator = "dor" | "orcamento" | "urgencia" | "decisor" | "abertura";
export type Notas = Record<Fator, number>; // cada nota de 0 a 5
export type Pesos = Record<Fator, number>; // pesos relativos (não precisam somar 100)

export const FATORES: { id: Fator; nome: string; dica: string }[] = [
  { id: "dor", nome: "Dor", dica: "Quanto o problema atrapalha o dia a dia" },
  { id: "orcamento", nome: "Orçamento", dica: "Pode pagar implantação e mensalidade" },
  { id: "urgencia", nome: "Urgência", dica: "Precisa resolver nos próximos 30 dias" },
  { id: "decisor", nome: "Decisor", dica: "Quem decide participou da conversa" },
  { id: "abertura", nome: "Abertura", dica: "Disposição para mudar o jeito de trabalhar" },
];

export const PESOS_PADRAO: Pesos = { dor: 30, orcamento: 25, urgencia: 20, decisor: 15, abertura: 10 };

export type Veredito = "quente" | "morno" | "frio";

export function calcularPontuacao(notas: Notas, pesos: Pesos = PESOS_PADRAO): number {
  const somaPesos = Object.values(pesos).reduce((a, b) => a + b, 0);
  if (somaPesos <= 0) return 0;
  const total = (Object.keys(pesos) as Fator[]).reduce((acc, f) => {
    const nota = Math.min(5, Math.max(0, notas[f] ?? 0));
    return acc + (nota / 5) * pesos[f];
  }, 0);
  return Math.round((total / somaPesos) * 100);
}

export function veredito(pontuacao: number): Veredito {
  if (pontuacao >= 70) return "quente";
  if (pontuacao >= 45) return "morno";
  return "frio";
}

/** Complexidade estimada pelas tarefas manuais (peso 1 a 3) e integrações citadas. */
export function complexidade(tarefas: { peso: number }[], integracoes: number): "baixa" | "media" | "alta" {
  const carga = tarefas.reduce((a, t) => a + t.peso, 0) + integracoes * 2;
  if (carga >= 12) return "alta";
  if (carga >= 6) return "media";
  return "baixa";
}

/** Calculadora de economia: horas por semana × custo da hora. */
export function economia(horasSemana: number, custoHora: number) {
  const semanal = Math.max(0, horasSemana) * Math.max(0, custoHora);
  return { semanal, mensal: semanal * 4.33, anual: semanal * 52 };
}
