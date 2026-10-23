CREATE TABLE "scripture_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"name_deva" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"section" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scripture_categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_category_id_scripture_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."scripture_categories"("id") ON DELETE set null ON UPDATE no action;