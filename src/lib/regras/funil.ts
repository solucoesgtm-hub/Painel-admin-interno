// Regras do funil de leads e clientes.
import { z } from "zod";

export const ETAPAS = [
  { id: "lead", nome: "Lead" },
  { id: "visita", nome: "Visita" },
  { id: "proposta", nome: "Proposta" },
  { id: "fechado", nome: "Fechado" },
  { id: "em_desenvolvimento", nome: "Em desenvolvimento" },
  { id: "manutencao", nome: "Manutenção" },
  { id: "perdido", nome: "Perdido" },
] as const;

export type EtapaId = (typeof ETAPAS)[number]["id"];
export const ETAPAS_IDS = ETAPAS.map((e) => e.id) as [EtapaId, ...EtapaId[]];
export const nomeEtapa = (id: EtapaId) => ETAPAS.find((e) => e.id === id)?.nome ?? id;

/** Etapas em que o card não conta como "parado" (cliente em rotina ou encerrado). */
const ETAPAS_SEM_PRAZO: EtapaId[] = ["manutencao", "perdido"];
export const DIAS_PARADO = 7;

export function estaParado(etapa: EtapaId, etapaDesde: string | Date, agora = new Date(), dias = DIAS_PARADO) {
  if (ETAPAS_SEM_PRAZO.includes(etapa)) return false;
  const desde = typeof etapaDesde === "string" ? new Date(etapaDesde) : etapaDesde;
  return agora.getTime() - desde.getTime() > dias * 86_400_000;
}

const opcional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** Todo card tem dono, próximo passo e data. Sem isso, não salva. */
export const esquemaNovoLead = z.object({
  nome: z.string().trim().min(2, "Informe o nome do comércio."),
  segmento: opcional(60),
  cidade: opcional(60),
  contatoNome: opcional(80),
  contatoTelefone: opcional(20),
  origem: opcional(40),
  donoId: z.string().min(1, "Escolha o dono do lead."),
  proximoPasso: z.string().trim().min(3, "Descreva o próximo passo."),
  proximoPassoData: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do próximo passo."),
});
export type DadosNovoLead = z.infer<typeof esquemaNovoLead>;

export const esquemaMoverEtapa = z
  .object({
    leadId: z.string().min(1),
    etapa: z.enum(ETAPAS_IDS),
    motivoPerda: z.string().trim().optional(),
  })
  .refine((v) => v.etapa !== "perdido" || (v.motivoPerda?.length ?? 0) >= 3, {
    message: "Informe o motivo ao marcar como Perdido.",
    path: ["motivoPerda"],
  });

export const MOTIVOS_PERDA = [
  "Preço acima do orçamento",
  "Sem urgência agora",
  "Escolheu concorrente",
  "Decisor não aprovou",
  "Sem resposta após proposta",
];

export const ORIGENS = ["Indicação", "Instagram", "Visita espontânea", "Evento", "Google", "WhatsApp"];
export const SEGMENTOS = ["Clínica", "Padaria", "Mercado", "Oficina", "Restaurante", "Loja de roupas", "Farmácia", "Academia"];
