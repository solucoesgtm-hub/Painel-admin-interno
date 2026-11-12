// Análise do funil calculada a partir dos leads reais.
import type { EtapaId } from "./funil";

export type LeadAnalise = {
  etapa: EtapaId;
  etapaDesde: string;
  origem: string;
  segmento: string;
  motivoPerda: string | null;
  pontuacao: number | null;
};

const ORDEM: EtapaId[] = ["lead", "visita", "proposta", "fechado", "em_desenvolvimento", "manutencao"];
const NOMES = ["Lead", "Visita", "Proposta", "Fechado", "Em desenv."];
const FECHOU: EtapaId[] = ["fechado", "em_desenvolvimento", "manutencao"];

function agrupar(valores: string[], limite = 6) {
  const mapa = new Map<string, number>();
  for (const v of valores) mapa.set(v || "Não informado", (mapa.get(v || "Não informado") ?? 0) + 1);
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite);
}

export function calcularAnalise(leads: LeadAnalise[], agora = new Date()) {
  // Um lead "chegou" a uma etapa se está nela ou em alguma posterior. Perdidos contam só como Lead,
  // porque o banco ainda não guarda em que etapa a perda aconteceu.
  const posicao = (l: LeadAnalise) => Math.max(0, ORDEM.indexOf(l.etapa));
  const conversao = NOMES.slice(0, 4).map((etapa, i) => ({ etapa, total: leads.filter((l) => posicao(l) >= i).length }));

  const tempoMedio = NOMES.map((etapa, i) => {
    const nela = leads.filter((l) => l.etapa === ORDEM[i]);
    const dias = nela.reduce((a, l) => a + (agora.getTime() - new Date(l.etapaDesde).getTime()) / 86_400_000, 0);
    return { etapa, dias: nela.length ? Math.round(dias / nela.length) : 0 };
  });

  const faixas = [
    { faixa: "0–44 (Frio)", min: 0, max: 44 },
    { faixa: "45–69 (Morno)", min: 45, max: 69 },
    { faixa: "70–100 (Quente)", min: 70, max: 100 },
  ];
  const comNota = leads.filter((l) => l.pontuacao !== null);
  const calibracao = faixas.map(({ faixa, min, max }) => {
    const grupo = comNota.filter((l) => l.pontuacao! >= min && l.pontuacao! <= max);
    return { faixa, leads: grupo.length, fecharam: grupo.filter((l) => FECHOU.includes(l.etapa)).length };
  });

  return {
    conversao,
    tempoMedio,
    origem: agrupar(leads.map((l) => l.origem)).map(([origem, total]) => ({ origem, total })),
    segmento: agrupar(leads.map((l) => l.segmento)).map(([segmento, total]) => ({ segmento, total })),
    motivosPerda: agrupar(leads.filter((l) => l.etapa === "perdido").map((l) => l.motivoPerda ?? "")).map(
      ([motivo, total]) => ({ motivo, total }),
    ),
    calibracao,
  };
}
