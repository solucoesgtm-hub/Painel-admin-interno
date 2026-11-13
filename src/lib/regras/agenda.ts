// Regras da agenda: eventos criados no Hub (e enviados ao Google Agenda quando ligado).
import { z } from "zod";

export const TIPOS_EVENTO = ["visita", "proximo_passo", "edital", "reuniao"] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

/** Id do "dono" dos eventos criados direto no Google, sem sócio definido. */
export const AGENDA_GTM = "gtm";

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida.");

export const esquemaEvento = z
  .object({
    titulo: z.string().trim().min(3, "Dê um título ao evento.").max(120),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
    inicio: hora,
    fim: hora,
    socioId: z.string().min(1, "Escolha o responsável."),
    tipo: z.enum(TIPOS_EVENTO),
    descricao: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine((e) => e.fim > e.inicio, { message: "O fim precisa ser depois do início.", path: ["fim"] });
export type DadosEvento = z.infer<typeof esquemaEvento>;

/** Converte um horário do Google ("2026-11-13T14:00:00-03:00" ou dia inteiro "2026-11-13") para data e hora locais. */
export function partesHorario(h: { dateTime?: string; date?: string }): { data: string; hora: string } {
  if (h.dateTime) return { data: h.dateTime.slice(0, 10), hora: h.dateTime.slice(11, 16) };
  return { data: h.date ?? "", hora: "" };
}
