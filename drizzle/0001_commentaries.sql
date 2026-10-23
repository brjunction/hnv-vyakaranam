CREATE TABLE "commentary_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"edition_id" integer NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "sutra_commentaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"sutra_id" integer NOT NULL,
	"commentary_type_id" integer NOT NULL,
	"html" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
ALTER TABLE "commentary_types" ADD CONSTRAINT "commentary_types_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentary_types" ADD CONSTRAINT "commentary_types_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sutra_commentaries" ADD CONSTRAINT "sutra_commentaries_sutra_id_sutras_id_fk" FOREIGN KEY ("sutra_id") REFERENCES "public"."sutras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sutra_commentaries" ADD CONSTRAINT "sutra_commentaries_commentary_type_id_commentary_types_id_fk" FOREIGN KEY ("commentary_type_id") REFERENCES "public"."commentary_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sutra_commentaries" ADD CONSTRAINT "sutra_commentaries_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commentary_types_edition_key_uq" ON "commentary_types" USING btree ("edition_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "sutra_commentaries_sutra_type_uq" ON "sutra_commentaries" USING btree ("sutra_id","commentary_type_id");--> statement-breakpoint
CREATE INDEX "sutra_commentaries_type_idx" ON "sutra_commentaries" USING btree ("commentary_type_id");