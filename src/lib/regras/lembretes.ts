// Regras dos lembretes de projeto (checklist).
import { z } from "zod";

/** Quantos lembretes cabem num projeto: o cartão mostra todos, sem rolagem interna. */
export const MAX_LEMBRETES = 12;
export const MAX_TEXTO_LEMBRETE = 60;

export type Lembrete = {
  id: string;
  projetoId: string;
  texto: string;
  feito: boolean;
  feitoEm: string | null;
  feitoPor: string | null;
  criadoEm: string;
};

export const esquemaNovoLembrete = z.object({
  projetoId: z.string().min(1).max(64),
  texto: z.string().trim().min(2, "Escreva o lembrete.").max(MAX_TEXTO_LEMBRETE, `Até ${MAX_TEXTO_LEMBRETE} caracteres.`),
});

export const esquemaMarcarLembrete = z.object({
  id: z.string().min(1).max(64),
  projetoId: z.string().min(1).max(64),
  feito: z.boolean(),
});

/** Progresso de um projeto: lembretes feitos sobre o total. Sem lembretes, 0 de 0. */
export function progressoLembretes(lista: Pick<Lembrete, "feito">[]) {
  const feitos = lista.filter((l) => l.feito).length;
  return { feitos, total: lista.length, fracao: lista.length ? feitos / lista.length : 0, concluido: lista.length > 0 && feitos === lista.length };
}
