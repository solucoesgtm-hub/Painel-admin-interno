// Tabelas do GTM Hub: sócios, leads, diagnósticos, histórico, empresa e contratos.
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
  /** Hash scrypt da senha (nunca a senha em texto). Definido com `npm run db:senha`. */
  senhaHash: text("senha_hash"),
  senhaDefinidaEm: timestamp("senha_definida_em", { withTimezone: true }),
  /** Última vez que usou o painel (gravado no máximo uma vez por minuto). */
  vistoEm: timestamp("visto_em", { withTimezone: true }),
  criadoEm,
});

/** Aparelhos que aceitaram notificações (Web Push). Um sócio pode ter vários (celular, computador). */
export const pushInscricoes = pgTable(
  "push_inscricoes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    socioId: uuid("socio_id")
      .notNull()
      .references(() => socios.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    aparelho: text("aparelho").notNull().default(""),
    criadoEm,
  },
  (t) => [index("push_inscricoes_socio_idx").on(t.socioId)],
);

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
    /** Proposta combinada com o cliente, em centavos (evita erro de arredondamento). */
    valorImplantacaoCentavos: integer("valor_implantacao_centavos").notNull().default(0),
    mensalidadeCentavos: integer("mensalidade_centavos").notNull().default(0),
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

export const situacaoGeracao = pgEnum("situacao_geracao", ["ok", "erro"]);

/**
 * Relatório e plano de protótipo gerados pela IA a partir de um diagnóstico.
 * Toda chamada fica registrada (inclusive as que falharam), com tokens e custo estimado,
 * para somar o gasto do mês contra o teto IA_TETO_MENSAL_BRL.
 */
export const planosIa = pgTable(
  "planos_ia",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    diagnosticoId: uuid("diagnostico_id").references(() => diagnosticos.id, { onDelete: "set null" }),
    situacao: situacaoGeracao("situacao").notNull().default("ok"),
    /** Resposta validada (relatório, plano e código). Vazio quando a geração falhou. */
    conteudo: jsonb("conteudo").$type<Record<string, unknown>>(),
    erro: text("erro"),
    modelo: text("modelo").notNull(),
    tokensEntrada: integer("tokens_entrada").notNull().default(0),
    tokensSaida: integer("tokens_saida").notNull().default(0),
    tokensCacheLeitura: integer("tokens_cache_leitura").notNull().default(0),
    tokensCacheEscrita: integer("tokens_cache_escrita").notNull().default(0),
    /** Custo estimado em centavos de real. */
    custoCentavos: integer("custo_centavos").notNull().default(0),
    criadoPor: uuid("criado_por")
      .notNull()
      .references(() => socios.id),
    criadoEm,
  },
  (t) => [index("planos_ia_lead_idx").on(t.leadId, t.criadoEm), index("planos_ia_criado_idx").on(t.criadoEm)],
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

/** Dados cadastrais da GTM ("Nossa empresa"). Uma única linha, id "gtm". */
export const empresa = pgTable("empresa", {
  id: text("id").primaryKey().default("gtm"),
  razaoSocial: text("razao_social").notNull().default(""),
  nomeFantasia: text("nome_fantasia").notNull().default(""),
  cnpj: text("cnpj").notNull().default(""),
  email: text("email").notNull().default(""),
  telefone: text("telefone").notNull().default(""),
  endereco: text("endereco").notNull().default(""),
  municipio: text("municipio").notNull().default(""),
  site: text("site").notNull().default(""),
  chavePix: text("chave_pix").notNull().default(""),
  abertura: date("abertura"),
  instagram: text("instagram").notNull().default(""),
  cep: text("cep").notNull().default(""),
  titular: text("titular").notNull().default(""),
  atividadePrincipal: text("atividade_principal").notNull().default(""),
  atividadesSecundarias: text("atividades_secundarias").notNull().default(""),
  capitalSocial: text("capital_social").notNull().default(""),
  atualizadoPor: uuid("atualizado_por").references(() => socios.id),
  atualizadoEm,
});

export const situacaoContrato = pgEnum("situacao_contrato", ["aguardando", "vigente", "encerrado"]);

/** Contratos com clientes: vigência, valores e situação. Renovação é calculada pela data de fim. */
export const contratos = pgTable(
  "contratos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    cliente: text("cliente").notNull(),
    produto: text("produto").notNull(),
    inicio: date("inicio").notNull(),
    fim: date("fim").notNull(),
    valorMensalCentavos: integer("valor_mensal_centavos").notNull().default(0),
    valorImplantacaoCentavos: integer("valor_implantacao_centavos").notNull().default(0),
    situacao: situacaoContrato("situacao").notNull().default("aguardando"),
    observacoes: text("observacoes").notNull().default(""),
    criadoPor: uuid("criado_por").references(() => socios.id),
    criadoEm,
    atualizadoEm,
  },
  (t) => [index("contratos_fim_idx").on(t.fim), index("contratos_lead_idx").on(t.leadId)],
);

/** Chat interno dos sócios. Mensagem apagada mantém a linha (apagadaEm) e perde o texto. */
export const mensagens = pgTable(
  "mensagens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    autorId: uuid("autor_id")
      .notNull()
      .references(() => socios.id),
    texto: text("texto").notNull(),
    apagadaEm: timestamp("apagada_em", { withTimezone: true }),
    criadoEm,
  },
  (t) => [index("mensagens_criado_idx").on(t.criadoEm)],
);

/** Até quando cada sócio leu o chat (para o contador de não lidas). */
export const chatLeituras = pgTable("chat_leituras", {
  socioId: uuid("socio_id")
    .primaryKey()
    .references(() => socios.id, { onDelete: "cascade" }),
  lidoAte: timestamp("lido_ate", { withTimezone: true }).notNull().defaultNow(),
});

/** Tentativas de login recusadas, para bloquear por um tempo depois de várias seguidas. */
export const loginTentativas = pgTable(
  "login_tentativas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** E-mail tentado (minúsculo) ou "ip:<endereço>". */
    chave: text("chave").notNull(),
    criadoEm,
  },
  (t) => [index("login_tentativas_chave_idx").on(t.chave, t.criadoEm)],
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
export type PlanoIa = typeof planosIa.$inferSelect;
export type NovoPlanoIa = typeof planosIa.$inferInsert;
export type Etapa =(typeof etapaLead.enumValues)[number];
