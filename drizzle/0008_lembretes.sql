CREATE TABLE "lembretes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projeto_id" text NOT NULL,
	"texto" text NOT NULL,
	"feito" boolean DEFAULT false NOT NULL,
	"feito_em" timestamp with time zone,
	"feito_por" uuid,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_feito_por_socios_id_fk" FOREIGN KEY ("feito_por") REFERENCES "public"."socios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_criado_por_socios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."socios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lembretes_projeto_idx" ON "lembretes" USING btree ("projeto_id","criado_em");