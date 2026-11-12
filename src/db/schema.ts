// Tabelas do GTM Hub (Fase 1: sócios, leads, diagnósticos e histórico).
// Para mudar o banco: edite este arquivo, rode `npm run db:gerar` e depois `npm run db:migrar`.
import { relations } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const etapaLead = pgEnum("etapa_lead", [
  "lead",
  "visita",
  "proposta",
  "fechado",
  "em_desenvolvimento",
  "manutencao",
  "perdido",
]);

export const veredito = pgEnum("veredito", ["quente", "morno", "frio"]);
export const complexidade = pgEnum("complexidade", ["baixa", "media", "alta"]);
export const tipoAtor = pgEnum("tipo_ator", ["socio", "agente", "sistema"]);

const criadoEm = timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();
const atualizadoEm = timestamp("atualizado_em", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

/** Os três sócios. O login só entra se o e-mail estiver nesta tabela. */
export const socios = pgTable("socios", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nome: text("nome").notNull(),
  area: text("area"),
  criadoEm,
});

/** Leads e clientes. Regra do Hub: todo registro tem dono e próximo passo com data. */
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    segmento: text("segmento"),
    cidade: text("cidade"),
    contatoNome: text("contato_nome"),
    contatoTelefone: text("contato_telefone"),
    origem: text("origem"),
    etapa: etapaLead("etapa").notNull().default("lead"),
    donoId: uuid("dono_id")
      .notNull()
      .references(() => socios.id),
    proximoPasso: text("proximo_passo").notNull(),
    proximoPassoData: date("proximo_passo_data").notNull(),
    motivoPerda: text("motivo_perda"),
    etapaDesde: timestamp("etapa_desde", { withTimezone: true }).notNull().defaultNow(),
    criadoEm,
    atualizadoEm,
  },
  (t) => [index("leads_etapa_idx").on(t.etapa), index("leads_dono_idx").on(t.donoId)],
);

/** Diagnóstico de visita. As respostas do checklist ficam em JSON. */
export const diagnosticos = pgTable(
  "diagnosticos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    respostas: jsonb("respostas").$type<Record<string, unknown>>().notNull(),
    pontuacao: integer("pontuacao").notNull(),
    veredito: veredito("veredito").notNull(),
    complexidade: complexidade("complexidade"),
    resumo: text("resumo"),
    criadoPor: uuid("criado_por")
      .notNull()
      .references(() => socios.id),
    criadoEm,
  },
  (t) => [index("diagnosticos_lead_idx").on(t.leadId)],
);

/** Histórico: quem fez o quê e quando. Nunca é editado nem apagado pelo sistema. */
export const historico = pgTable(
  "historico",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    atorTipo: tipoAtor("ator_tipo").notNull(),
    atorId: uuid("ator_id"),
    acao: text("acao").notNull(),
    entidade: text("entidade").notNull(),
    entidadeId: uuid("entidade_id"),
    detalhes: jsonb("detalhes").$type<Record<string, unknown>>(),
    criadoEm,
  },
  (t) => [
    index("historico_entidade_idx").on(t.entidade, t.entidadeId),
    index("historico_criado_idx").on(t.criadoEm),
  ],
);

export const leadsRelacoes = relations(leads, ({ one, many }) => ({
  dono: one(socios, { fields: [leads.donoId], references: [socios.id] }),
  diagnosticos: many(diagnosticos),
}));

export const diagnosticosRelacoes = relations(diagnosticos, ({ one }) => ({
  lead: one(leads, { fields: [diagnosticos.leadId], references: [leads.id] }),
  autor: one(socios, { fields: [diagnosticos.criadoPor], references: [socios.id] }),
}));

export type Socio = typeof socios.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type NovoLead = typeof leads.$inferInsert;
export type Diagnostico = typeof diagnosticos.$inferSelect;
export type NovoDiagnostico = typeof diagnosticos.$inferInsert;
export type Etapa = (typeof etapaLead.enumValues)[number];
