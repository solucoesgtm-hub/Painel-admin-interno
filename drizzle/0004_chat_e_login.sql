CREATE TABLE "chat_leituras" (
	"socio_id" uuid PRIMARY KEY NOT NULL,
	"lido_ate" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_tentativas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autor_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"apagada_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_leituras" ADD CONSTRAINT "chat_leituras_socio_id_socios_id_fk" FOREIGN KEY ("socio_id") REFERENCES "public"."socios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_autor_id_socios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."socios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_tentativas_chave_idx" ON "login_tentativas" USING btree ("chave","criado_em");--> statement-breakpoint
CREATE INDEX "mensagens_criado_idx" ON "mensagens" USING btree ("criado_em");