CREATE TYPE "public"."tipo_lembrete" AS ENUM('lembrete', 'tarefa');--> statement-breakpoint
ALTER TABLE "lembretes" ALTER COLUMN "projeto_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lembretes" ADD COLUMN "tipo" "tipo_lembrete" DEFAULT 'lembrete' NOT NULL;--> statement-breakpoint
ALTER TABLE "lembretes" ADD COLUMN "assunto" text;--> statement-breakpoint
ALTER TABLE "lembretes" ADD COLUMN "prazo" date;--> statement-breakpoint
ALTER TABLE "lembretes" ADD COLUMN "responsavel_id" uuid;--> statement-breakpoint
ALTER TABLE "lembretes" ADD CONSTRAINT "lembretes_responsavel_id_socios_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."socios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lembretes_prazo_idx" ON "lembretes" USING btree ("feito","prazo");