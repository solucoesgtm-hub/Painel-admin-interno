CREATE TYPE "public"."situacao_contrato" AS ENUM('aguardando', 'vigente', 'encerrado');--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"cliente" text NOT NULL,
	"produto" text NOT NULL,
	"inicio" date NOT NULL,
	"fim" date NOT NULL,
	"valor_mensal_centavos" integer DEFAULT 0 NOT NULL,
	"valor_implantacao_centavos" integer DEFAULT 0 NOT NULL,
	"situacao" "situacao_contrato" DEFAULT 'aguardando' NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa" (
	"id" text PRIMARY KEY DEFAULT 'gtm' NOT NULL,
	"razao_social" text DEFAULT '' NOT NULL,
	"nome_fantasia" text DEFAULT '' NOT NULL,
	"cnpj" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"telefone" text DEFAULT '' NOT NULL,
	"endereco" text DEFAULT '' NOT NULL,
	"municipio" text DEFAULT '' NOT NULL,
	"site" text DEFAULT '' NOT NULL,
	"chave_pix" text DEFAULT '' NOT NULL,
	"abertura" date,
	"atualizado_por" uuid,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_criado_por_socios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_atualizado_por_socios_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contratos_fim_idx" ON "contratos" USING btree ("fim");--> statement-breakpoint
CREATE INDEX "contratos_lead_idx" ON "contratos" USING btree ("lead_id");