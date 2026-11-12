ALTER TABLE "socios" ADD COLUMN "senha_hash" text;--> statement-breakpoint
ALTER TABLE "socios" ADD COLUMN "senha_definida_em" timestamp with time zone;