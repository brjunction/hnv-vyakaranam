CREATE TABLE "more_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"link_label" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"person" text DEFAULT '' NOT NULL,
	"badge" text DEFAULT '' NOT NULL,
	"stage" text DEFAULT '' NOT NULL,
	"date" date,
	"pinned" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "more_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"title" text NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'posts' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "more_sections_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "more_items" ADD CONSTRAINT "more_items_section_id_more_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."more_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "more_items" ADD CONSTRAINT "more_items_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "more_sections" ADD CONSTRAINT "more_sections_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "more_items_section_slug_uq" ON "more_items" USING btree ("section_id","slug");--> statement-breakpoint
CREATE INDEX "more_items_section_sort_idx" ON "more_items" USING btree ("section_id","sort");