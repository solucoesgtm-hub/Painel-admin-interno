CREATE TYPE "public"."marcador_ideia" AS ENUM('gostei', 'pode_melhorar', 'genial', 'nao_curti');--> statement-breakpoint
CREATE TYPE "public"."situacao_ideia" AS ENUM('aberta', 'finalizada');--> statement-breakpoint
CREATE TABLE "ideias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autor_id" uuid,
	"titulo" text NOT NULL,
	"texto" text DEFAULT '' NOT NULL,
	"situacao" "situacao_ideia" DEFAULT 'aberta' NOT NULL,
	"finalizada_em" timestamp with time zone,
	"finalizada_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ideias_marcadores" (
	"ideia_id" uuid NOT NULL,
	"socio_id" uuid NOT NULL,
	"marcador" "marcador_ideia" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ideias_marcadores_ideia_id_socio_id_pk" PRIMARY KEY("ideia_id","socio_id")
);
--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "documento" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "documento_dados" jsonb;--> statement-breakpoint
ALTER TABLE "contratos" ADD COLUMN "documento_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ideias" ADD CONSTRAINT "ideias_autor_id_socios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."socios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideias" ADD CONSTRAINT "ideias_finalizada_por_socios_id_fk" FOREIGN KEY ("finalizada_por") REFERENCES "public"."socios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideias_marcadores" ADD CONSTRAINT "ideias_marcadores_ideia_id_ideias_id_fk" FOREIGN KEY ("ideia_id") REFERENCES "public"."ideias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideias_marcadores" ADD CONSTRAINT "ideias_marcadores_socio_id_socios_id_fk" FOREIGN KEY ("socio_id") REFERENCES "public"."socios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ideias_criado_idx" ON "ideias" USING btree ("criado_em");