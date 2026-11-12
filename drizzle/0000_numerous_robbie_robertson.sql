CREATE TYPE "public"."complexidade" AS ENUM('baixa', 'media', 'alta');--> statement-breakpoint
CREATE TYPE "public"."etapa_lead" AS ENUM('lead', 'visita', 'proposta', 'fechado', 'em_desenvolvimento', 'manutencao', 'perdido');--> statement-breakpoint
CREATE TYPE "public"."tipo_ator" AS ENUM('socio', 'agente', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."veredito" AS ENUM('quente', 'morno', 'frio');--> statement-breakpoint
CREATE TABLE "diagnosticos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"respostas" jsonb NOT NULL,
	"pontuacao" integer NOT NULL,
	"veredito" "veredito" NOT NULL,
	"complexidade" "complexidade",
	"resumo" text,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ator_tipo" "tipo_ator" NOT NULL,
	"ator_id" uuid,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" uuid,
	"detalhes" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"segmento" text,
	"cidade" text,
	"contato_nome" text,
	"contato_telefone" text,
	"origem" text,
	"etapa" "etapa_lead" DEFAULT 'lead' NOT NULL,
	"dono_id" uuid NOT NULL,
	"proximo_passo" text NOT NULL,
	"proximo_passo_data" date NOT NULL,
	"motivo_perda" text,
	"etapa_desde" timestamp with time zone DEFAULT now() NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "socios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"area" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "socios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "diagnosticos" ADD CONSTRAINT "diagnosticos_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosticos" ADD CONSTRAINT "diagnosticos_criado_por_socios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_dono_id_socios_id_fk" FOREIGN KEY ("dono_id") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnosticos_lead_idx" ON "diagnosticos" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "historico_entidade_idx" ON "historico" USING btree ("entidade","entidade_id");--> statement-breakpoint
CREATE INDEX "historico_criado_idx" ON "historico" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "leads_etapa_idx" ON "leads" USING btree ("etapa");--> statement-breakpoint
CREATE INDEX "leads_dono_idx" ON "leads" USING btree ("dono_id");