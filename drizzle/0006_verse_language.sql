ALTER TABLE "books" ADD COLUMN "verse_language" text DEFAULT 'sanskrit' NOT NULL;--> statement-breakpoint
ALTER TABLE "scripture_verses" ADD COLUMN "language" text DEFAULT '' NOT NULL;