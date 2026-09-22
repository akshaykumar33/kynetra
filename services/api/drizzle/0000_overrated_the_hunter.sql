CREATE TABLE "buildings" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"district_id" varchar(50) NOT NULL,
	"campus_id" varchar(50),
	"name" varchar(100) NOT NULL,
	"code" varchar(10) NOT NULL,
	"total_floors" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"theme" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"coord_x" integer DEFAULT 0 NOT NULL,
	"coord_y" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"key_landmark" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "floors" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"building_id" varchar(50) NOT NULL,
	"floor_number" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(30) NOT NULL,
	"description" text NOT NULL,
	"capacity" integer DEFAULT 100 NOT NULL,
	"current_occupancy" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interactive_nodes" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"floor_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"node_type" varchar(30) NOT NULL,
	"pos_x" double precision DEFAULT 0 NOT NULL,
	"pos_y" double precision DEFAULT 0 NOT NULL,
	"pos_z" double precision DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"active_session_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"domain" varchar(255),
	"subscription_tier" varchar(20) DEFAULT 'free' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tenant_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"handle" varchar(30) NOT NULL,
	"display_name" varchar(60) NOT NULL,
	"role" varchar(20) DEFAULT 'developer' NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"current_district_id" varchar(50) DEFAULT 'kynetra-central' NOT NULL,
	"status_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floors" ADD CONSTRAINT "floors_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactive_nodes" ADD CONSTRAINT "interactive_nodes_floor_id_floors_id_fk" FOREIGN KEY ("floor_id") REFERENCES "public"."floors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;