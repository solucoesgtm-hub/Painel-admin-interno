// Mural de ideias: cada sócio publica ideias; os outros marcam a opinião (um marcador por sócio).
// A ideia pode ser finalizada (e reaberta) ou excluída.
import { z } from "zod";

export const MARCADORES = ["gostei", "genial", "pode_melhorar", "nao_curti"] as const;
export type Marcador = (typeof MARCADORES)[number];

export const NOME_MARCADOR: Record<Marcador, string> = {
  gostei: "Gostei",
  genial: "Genial",
  pode_melhorar: "Pode melhorar",
  nao_curti: "Não curti",
};

export type Ideia = {
  id: string;
  autorId: string | null;
  titulo: string;
  texto: string;
  situacao: "aberta" | "finalizada";
  criadoEm: string;
  finalizadaEm: string | null;
  finalizadaPor: string | null;
  marcadores: { socioId: string; marcador: Marcador }[];
};

export const esquemaIdeia = z.object({
  titulo: z.string().trim().min(3, "Dê um título à ideia.").max(120, "Até 120 caracteres."),
  texto: z.string().trim().max(2000, "Até 2000 caracteres.").default(""),
});

export const esquemaMarcar = z.object({
  ideiaId: z.string().min(1).max(64),
  /** null tira o marcador. */
  marcador: z.enum(MARCADORES).nullable(),
});

export const esquemaSituacao = z.object({ ideiaId: z.string().min(1).max(64), situacao: z.enum(["aberta", "finalizada"]) });

/** Contagem por marcador, na ordem fixa dos botões. */
export function contarMarcadores(m: Ideia["marcadores"]): Record<Marcador, number> {
  const c = { gostei: 0, genial: 0, pode_melhorar: 0, nao_curti: 0 } as Record<Marcador, number>;
  for (const x of m) c[x.marcador]++;
  return c;
}

/** "Termômetro" simples: genial vale 2, gostei 1, pode melhorar 0, não curti -1. */
export function pontuacaoIdeia(m: Ideia["marcadores"]): number {
  const peso: Record<Marcador, number> = { genial: 2, gostei: 1, pode_melhorar: 0, nao_curti: -1 };
  return m.reduce((s, x) => s + peso[x.marcador], 0);
}

/** Quem ainda não deu opinião (o autor não conta). */
export function faltamOpinar(i: Pick<Ideia, "autorId" | "marcadores">, socios: string[]): string[] {
  const deram = new Set(i.marcadores.map((x) => x.socioId));
  return socios.filter((s) => s !== i.autorId && !deram.has(s));
}

export type OrdemIdeias = "recentes" | "melhores";

export function ordenarIdeias(lista: Ideia[], ordem: OrdemIdeias): Ideia[] {
  return [...lista].sort((a, b) =>
    ordem === "melhores" ? pontuacaoIdeia(b.marcadores) - pontuacaoIdeia(a.marcadores) || b.criadoEm.localeCompare(a.criadoEm) : b.criadoEm.localeCompare(a.criadoEm),
  );
}
