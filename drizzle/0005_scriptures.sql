CREATE TABLE "scripture_commentaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_id" integer NOT NULL,
	"verse_id" integer,
	"division_id" integer,
	"html" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "scripture_commentary_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"name_deva" text DEFAULT '' NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"language" text DEFAULT 'english' NOT NULL,
	"applies_to" text DEFAULT 'verse' NOT NULL,
	"pane" text DEFAULT 'commentary' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "scripture_divisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"parent_id" integer,
	"depth" integer DEFAULT 0 NOT NULL,
	"key" text NOT NULL,
	"number" text DEFAULT '' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"title_deva" text DEFAULT '' NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"expected_children" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "scripture_verses" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"division_id" integer NOT NULL,
	"key" text NOT NULL,
	"verse_no" text NOT NULL,
	"verse_from" integer NOT NULL,
	"verse_to" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"devanagari" text DEFAULT '' NOT NULL,
	"iast" text DEFAULT '' NOT NULL,
	"speaker" text DEFAULT '' NOT NULL,
	"daily_eligible" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
ALTER TABLE "books" ALTER COLUMN "structure" SET DEFAULT 'chapter_verse';--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "levels" jsonb DEFAULT '["Chapter"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "verse_label" text DEFAULT 'Verse' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "verse_label_plural" text DEFAULT 'Verses' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "abbrev" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "author" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "cover_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "intro_html" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "scripture_commentaries" ADD CONSTRAINT "scripture_commentaries_type_id_scripture_commentary_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."scripture_commentary_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_commentaries" ADD CONSTRAINT "scripture_commentaries_verse_id_scripture_verses_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."scripture_verses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_commentaries" ADD CONSTRAINT "scripture_commentaries_division_id_scripture_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."scripture_divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_commentaries" ADD CONSTRAINT "scripture_commentaries_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_commentary_types" ADD CONSTRAINT "scripture_commentary_types_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_commentary_types" ADD CONSTRAINT "scripture_commentary_types_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_divisions" ADD CONSTRAINT "scripture_divisions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_divisions" ADD CONSTRAINT "scripture_divisions_parent_id_scripture_divisions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."scripture_divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_divisions" ADD CONSTRAINT "scripture_divisions_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_verses" ADD CONSTRAINT "scripture_verses_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_verses" ADD CONSTRAINT "scripture_verses_division_id_scripture_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."scripture_divisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_verses" ADD CONSTRAINT "scripture_verses_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scripture_commentaries_verse_uq" ON "scripture_commentaries" USING btree ("type_id","verse_id") WHERE "scripture_commentaries"."verse_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "scripture_commentaries_division_uq" ON "scripture_commentaries" USING btree ("type_id","division_id") WHERE "scripture_commentaries"."division_id" is not null;--> statement-breakpoint
CREATE INDEX "scripture_commentaries_verse_idx" ON "scripture_commentaries" USING btree ("verse_id");--> statement-breakpoint
CREATE INDEX "scripture_commentaries_division_idx" ON "scripture_commentaries" USING btree ("division_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scripture_commentary_types_book_key_uq" ON "scripture_commentary_types" USING btree ("book_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "scripture_divisions_parent_key_uq" ON "scripture_divisions" USING btree ("book_id",coalesce("parent_id", 0),"key");--> statement-breakpoint
CREATE INDEX "scripture_divisions_parent_idx" ON "scripture_divisions" USING btree ("book_id","parent_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "scripture_verses_division_key_uq" ON "scripture_verses" USING btree ("division_id","key");--> statement-breakpoint
CREATE INDEX "scripture_verses_division_position_idx" ON "scripture_verses" USING btree ("division_id","position");--> statement-breakpoint
CREATE INDEX "scripture_verses_book_idx" ON "scripture_verses" USING btree ("book_id");