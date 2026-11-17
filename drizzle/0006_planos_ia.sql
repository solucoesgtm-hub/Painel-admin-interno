CREATE TYPE "public"."situacao_geracao" AS ENUM('ok', 'erro');--> statement-breakpoint
CREATE TABLE "planos_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"diagnostico_id" uuid,
	"situacao" "situacao_geracao" DEFAULT 'ok' NOT NULL,
	"conteudo" jsonb,
	"erro" text,
	"modelo" text NOT NULL,
	"tokens_entrada" integer DEFAULT 0 NOT NULL,
	"tokens_saida" integer DEFAULT 0 NOT NULL,
	"tokens_cache_leitura" integer DEFAULT 0 NOT NULL,
	"tokens_cache_escrita" integer DEFAULT 0 NOT NULL,
	"custo_centavos" integer DEFAULT 0 NOT NULL,
	"criado_por" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planos_ia" ADD CONSTRAINT "planos_ia_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planos_ia" ADD CONSTRAINT "planos_ia_diagnostico_id_diagnosticos_id_fk" FOREIGN KEY ("diagnostico_id") REFERENCES "public"."diagnosticos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planos_ia" ADD CONSTRAINT "planos_ia_criado_por_socios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "planos_ia_lead_idx" ON "planos_ia" USING btree ("lead_id","criado_em");--> statement-breakpoint
CREATE INDEX "planos_ia_criado_idx" ON "planos_ia" USING btree ("criado_em");