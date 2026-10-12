ALTER TABLE "building" ADD COLUMN "campus_x" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "campus_z" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "width" real DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "depth" real DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "levels" integer DEFAULT 8 NOT NULL;--> statement-breakpoint
ALTER TABLE "building" ADD COLUMN "color" text DEFAULT '#8fb3c9' NOT NULL;