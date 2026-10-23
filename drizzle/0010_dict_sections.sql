CREATE TABLE "dict_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dict_sections_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "dictionaries" ADD COLUMN "section_id" integer;--> statement-breakpoint
ALTER TABLE "dictionaries" ADD CONSTRAINT "dictionaries_section_id_dict_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."dict_sections"("id") ON DELETE set null ON UPDATE no action;