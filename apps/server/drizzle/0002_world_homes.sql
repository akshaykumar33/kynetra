CREATE TYPE "public"."district" AS ENUM('commons', 'business', 'residential');--> statement-breakpoint
CREATE TABLE "home_invite" (
	"owner_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_invite_owner_id_guest_id_pk" PRIMARY KEY("owner_id","guest_id")
);
--> statement-breakpoint
CREATE TABLE "home" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lot" integer NOT NULL,
	"open" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "district" "district" DEFAULT 'business' NOT NULL;--> statement-breakpoint
ALTER TABLE "home_invite" ADD CONSTRAINT "home_invite_owner_id_home_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."home"("owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_invite" ADD CONSTRAINT "home_invite_guest_id_user_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home" ADD CONSTRAINT "home_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "home_invite_guest_idx" ON "home_invite" USING btree ("guest_id");--> statement-breakpoint
CREATE UNIQUE INDEX "home_lot_idx" ON "home" USING btree ("lot");