CREATE TABLE "songs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"alt_titles" text DEFAULT '' NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"book" text DEFAULT '' NOT NULL,
	"book_place" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'Song' NOT NULL,
	"language" text DEFAULT 'bengali' NOT NULL,
	"verses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"intro_html" text DEFAULT '' NOT NULL,
	"purport_html" text DEFAULT '' NOT NULL,
	"translator" text DEFAULT '' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "songs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "sutras" ADD COLUMN "brhat_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "songs_book_idx" ON "songs" USING btree ("book");--> statement-breakpoint
CREATE INDEX "songs_author_idx" ON "songs" USING btree ("author");