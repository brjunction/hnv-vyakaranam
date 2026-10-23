CREATE TABLE "dictionaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"format" text DEFAULT 'stardict' NOT NULL,
	"headword_scheme" text DEFAULT 'iast' NOT NULL,
	"files" jsonb NOT NULL,
	"index_url" text DEFAULT '' NOT NULL,
	"info" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"total_bytes" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "dictionaries_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "dictionaries" ADD CONSTRAINT "dictionaries_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;