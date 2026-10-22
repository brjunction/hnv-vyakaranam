CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audio_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"title" text NOT NULL,
	"speaker" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"title_deva" text DEFAULT '' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"structure" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "cantos" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"expected_chapters" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"edition_id" integer NOT NULL,
	"slug" text NOT NULL,
	"number" integer,
	"title" text NOT NULL,
	"title_en" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'sutras' NOT NULL,
	"range_label" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "daily_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"pool" text DEFAULT 'subhashita' NOT NULL,
	"sanskrit" text NOT NULL,
	"iast" text DEFAULT '' NOT NULL,
	"translation" text DEFAULT '' NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "daily_pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"pool" text NOT NULL,
	"date" date NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "editions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "editions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "field_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"book_code" text,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"language" text DEFAULT 'english' NOT NULL,
	"format" text DEFAULT 'plain' NOT NULL,
	"is_commentary" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"ip" text,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"section" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "practice_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic_id" integer NOT NULL,
	"code" text NOT NULL,
	"difficulty" text NOT NULL,
	"type" text NOT NULL,
	"prompt" text NOT NULL,
	"prompt_sub" text DEFAULT '' NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text NOT NULL,
	"sutra_refs" text[] NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "practice_questions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "practice_topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"sutra_from" text,
	"sutra_to" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revisions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_table" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"user_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"field_key" text NOT NULL,
	"script" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "scripture_chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"canto" integer DEFAULT 0 NOT NULL,
	"number" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "subchapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sutra_notes" (
	"sutra_id" integer PRIMARY KEY NOT NULL,
	"html" text NOT NULL,
	"source" text DEFAULT 'admin' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "sutras" (
	"id" serial PRIMARY KEY NOT NULL,
	"edition_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"subchapter_id" integer,
	"number" text NOT NULL,
	"position" integer NOT NULL,
	"sanskrit" text DEFAULT '' NOT NULL,
	"transliteration" text DEFAULT '' NOT NULL,
	"synonyms" text DEFAULT '' NOT NULL,
	"vrtti" text DEFAULT '' NOT NULL,
	"translation" text DEFAULT '' NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"daily_eligible" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "verses" (
	"id" serial PRIMARY KEY NOT NULL,
	"book_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"canto" integer DEFAULT 0 NOT NULL,
	"chapter" integer NOT NULL,
	"verse_key" text NOT NULL,
	"verse_no" text NOT NULL,
	"verse_from" integer NOT NULL,
	"verse_to" integer NOT NULL,
	"position" integer NOT NULL,
	"iast" text DEFAULT '' NOT NULL,
	"devanagari" text DEFAULT '' NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"daily_eligible" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer
);
--> statement-breakpoint
ALTER TABLE "audio_links" ADD CONSTRAINT "audio_links_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cantos" ADD CONSTRAINT "cantos_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_items" ADD CONSTRAINT "daily_items_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_pins" ADD CONSTRAINT "daily_pins_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_blocks" ADD CONSTRAINT "home_blocks_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_topic_id_practice_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."practice_topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_topics" ADD CONSTRAINT "practice_topics_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_overrides" ADD CONSTRAINT "script_overrides_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scripture_chapters" ADD CONSTRAINT "scripture_chapters_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subchapters" ADD CONSTRAINT "subchapters_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sutra_notes" ADD CONSTRAINT "sutra_notes_sutra_id_sutras_id_fk" FOREIGN KEY ("sutra_id") REFERENCES "public"."sutras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sutra_notes" ADD CONSTRAINT "sutra_notes_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sutras" ADD CONSTRAINT "sutras_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sutras" ADD CONSTRAINT "sutras_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sutras" ADD CONSTRAINT "sutras_subchapter_id_subchapters_id_fk" FOREIGN KEY ("subchapter_id") REFERENCES "public"."subchapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sutras" ADD CONSTRAINT "sutras_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verses" ADD CONSTRAINT "verses_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verses" ADD CONSTRAINT "verses_chapter_id_scripture_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."scripture_chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verses" ADD CONSTRAINT "verses_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_lower_uq" ON "admin_users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "audio_links_entity_idx" ON "audio_links" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cantos_book_number_uq" ON "cantos" USING btree ("book_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_edition_slug_uq" ON "chapters" USING btree ("edition_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_pins_pool_date_uq" ON "daily_pins" USING btree ("pool","date");--> statement-breakpoint
CREATE UNIQUE INDEX "field_definitions_scope_book_key_uq" ON "field_definitions" USING btree ("scope",coalesce("book_code", ''),"key");--> statement-breakpoint
CREATE INDEX "login_attempts_email_time_idx" ON "login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "practice_questions_topic_idx" ON "practice_questions" USING btree ("topic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_topics_chapter_slug_uq" ON "practice_topics" USING btree ("chapter_id","slug");--> statement-breakpoint
CREATE INDEX "revisions_entity_idx" ON "revisions" USING btree ("entity_table","entity_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "script_overrides_uq" ON "script_overrides" USING btree ("entity_type","entity_id","field_key","script");--> statement-breakpoint
CREATE UNIQUE INDEX "scripture_chapters_book_canto_number_uq" ON "scripture_chapters" USING btree ("book_id","canto","number");--> statement-breakpoint
CREATE UNIQUE INDEX "subchapters_chapter_slug_uq" ON "subchapters" USING btree ("chapter_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "sutras_edition_number_uq" ON "sutras" USING btree ("edition_id","number");--> statement-breakpoint
CREATE INDEX "sutras_chapter_position_idx" ON "sutras" USING btree ("chapter_id","position");--> statement-breakpoint
CREATE INDEX "sutras_subchapter_idx" ON "sutras" USING btree ("subchapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "verses_book_canto_chapter_key_uq" ON "verses" USING btree ("book_id","canto","chapter","verse_key");--> statement-breakpoint
CREATE INDEX "verses_chapter_position_idx" ON "verses" USING btree ("chapter_id","position");--> statement-breakpoint
CREATE INDEX "verses_range_idx" ON "verses" USING btree ("book_id","canto","chapter","verse_from","verse_to");