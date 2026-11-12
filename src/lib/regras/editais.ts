// Regras da triagem de editais.
export type Marcacao = "atende" | "nao_atende" | "verificar";
export type Requisito = {
  id: string;
  texto: string;
  eliminatorio: boolean;
  marcacao: Marcacao;
  pagina?: number | null;
  trecho?: string | null;
  perfil?: string;
};

/** Sem página e trecho citados, a marcação é sempre Verificar. */
export function normalizarMarcacao(r: Requisito): Marcacao {
  if (!r.pagina || !r.trecho?.trim()) return "verificar";
  return r.marcacao;
}

export type VereditoEdital =
  | { tipo: "apto" }
  | { tipo: "apto_com_ajustes"; faltas: string[] }
  | { tipo: "nao_apto"; motivos: string[] };

export function vereditoEdital(requisitos: Requisito[]): VereditoEdital {
  const normal = requisitos.map((r) => ({ ...r, marcacao: normalizarMarcacao(r) }));
  const falhos = normal.filter((r) => r.eliminatorio && r.marcacao === "nao_atende");
  if (falhos.length) return { tipo: "nao_apto", motivos: falhos.map((r) => r.texto) };
  const pendentes = normal.filter((r) => r.marcacao !== "atende");
  if (pendentes.length) return { tipo: "apto_com_ajustes", faltas: pendentes.map((r) => r.texto) };
  return { tipo: "apto" };
}
