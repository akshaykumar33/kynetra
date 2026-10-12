CREATE TABLE "home_note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_owner_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "home" ADD COLUMN "decor" jsonb;--> statement-breakpoint
ALTER TABLE "home_note" ADD CONSTRAINT "home_note_home_owner_id_home_owner_id_fk" FOREIGN KEY ("home_owner_id") REFERENCES "public"."home"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_note" ADD CONSTRAINT "home_note_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "home_note_home_idx" ON "home_note" USING btree ("home_owner_id","created_at");--> statement-breakpoint
CREATE INDEX "home_note_author_idx" ON "home_note" USING btree ("author_id");