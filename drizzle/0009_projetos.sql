CREATE TYPE "public"."situacao_projeto" AS ENUM('planejado', 'em_andamento', 'em_teste', 'entregue', 'pausado');--> statement-breakpoint
CREATE TABLE "projetos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"cliente" text NOT NULL,
	"lead_id" uuid,
	"situacao" "situacao_projeto" DEFAULT 'planejado' NOT NULL,
	"dono_id" uuid,
	"prazo" date NOT NULL,
	"repositorio" text DEFAULT '' NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lembretes" ALTER COLUMN "projeto_id" SET DATA TYPE uuid USING "projeto_id"::uuid;--> statement-breakpoint
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_dono_id_socios_id_fk" FOREIGN KEY ("dono_id") REFERENCES "public"."socios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_criado_por_socios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projetos_prazo_idx" ON "projetos" USING btree ("prazo");--> statement-breakpoint
CREATE INDEX "projetos_lead_idx" ON "projetos" USING btree ("lead_id");--> statement-breakpoint
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_projeto_id_projetos_id_fk" FOREIGN KEY ("projeto_id") REFERENCES "public"."projetos"("id") ON DELETE cascade ON UPDATE no action;