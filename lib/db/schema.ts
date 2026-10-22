// HNV platform — database schema (Neon Postgres, Drizzle ORM).
//
// This file is the single source of truth for the database shape.
// docs/02-data-model.md explains every table. Change the schema ONLY here,
// then run `npm run db:generate` to create a migration (never hand-edit an
// applied migration). Rules:
//   - additive changes are preferred (new nullable columns, new tables)
//   - "enum-like" columns are `text` with a TS enum, not Postgres ENUM types,
//     so adding a value never needs a migration
//   - every content table has status + timestamps + updated_by
import {
  pgTable,
  serial,
  bigserial,
  integer,
  text,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Shared column helpers
// ---------------------------------------------------------------------------
export const CONTENT_STATUS = ["draft", "published", "archived"] as const;
export type ContentStatus = (typeof CONTENT_STATUS)[number];

const status = () => text("status", { enum: CONTENT_STATUS }).notNull().default("published");
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const updatedBy = () => integer("updated_by").references(() => adminUsers.id, { onDelete: "set null" });

/** Custom-field values: { [fieldKey]: string }. Keys defined in field_definitions. */
export type ExtraFields = Record<string, string>;

// ---------------------------------------------------------------------------
// Admin users & auth
// ---------------------------------------------------------------------------
export const ADMIN_ROLES = ["owner", "editor", "contributor"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ADMIN_ROLES }).notNull().default("editor"),
    isActive: boolean("is_active").notNull().default(true),
    /** Bump to invalidate every existing session of this user. */
    sessionVersion: integer("session_version").notNull().default(1),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("admin_users_email_lower_uq").on(sql`lower(${t.email})`)]
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: text("email").notNull(),
    ip: text("ip"),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("login_attempts_email_time_idx").on(t.email, t.createdAt)]
);

// ---------------------------------------------------------------------------
// Custom fields ("any extra column auto-appears")
// ---------------------------------------------------------------------------
export const FIELD_SCOPES = ["sutra", "verse"] as const;
export const FIELD_LANGUAGES = ["sanskrit", "english"] as const;
export const FIELD_FORMATS = ["plain", "rich"] as const;

export const fieldDefinitions = pgTable(
  "field_definitions",
  {
    id: serial("id").primaryKey(),
    /** "sutra" | "verse" */
    scope: text("scope", { enum: FIELD_SCOPES }).notNull(),
    /** For verse fields: which book ("sb" | "bg"); null = all books. Always null for sutra fields. */
    bookCode: text("book_code"),
    /** Stable machine key used inside `extra` JSON, e.g. "anvaya", "word_for_word". */
    key: text("key").notNull(),
    label: text("label").notNull(),
    /** Sanskrit fields go through the script engine; English fields never do. */
    language: text("language", { enum: FIELD_LANGUAGES }).notNull().default("english"),
    format: text("format", { enum: FIELD_FORMATS }).notNull().default("plain"),
    /** Shown in the commentary pane (scriptures) rather than with the verse text. */
    isCommentary: boolean("is_commentary").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("field_definitions_scope_book_key_uq").on(t.scope, sql`coalesce(${t.bookCode}, '')`, t.key),
  ]
);

// ---------------------------------------------------------------------------
// HNV: editions → chapters → subchapters → sutras (+ notes)
// ---------------------------------------------------------------------------
export const editions = pgTable("editions", {
  id: serial("id").primaryKey(),
  /** "madhyama" | "laghu" | "brhat" */
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  sort: integer("sort").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const CHAPTER_KINDS = ["sutras", "verses"] as const;

export const chapters = pgTable(
  "chapters",
  {
    id: serial("id").primaryKey(),
    editionId: integer("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    /** Displayed chapter number; null for Maṅgalācaraṇa / Afterword. */
    number: integer("number"),
    title: text("title").notNull(),
    titleEn: text("title_en").notNull(),
    summary: text("summary").notNull().default(""),
    kind: text("kind", { enum: CHAPTER_KINDS }).notNull().default("sutras"),
    /** Human label, e.g. "1–86" or "6 verses". */
    rangeLabel: text("range_label").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    status: status(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: updatedBy(),
  },
  (t) => [uniqueIndex("chapters_edition_slug_uq").on(t.editionId, t.slug)]
);

export const subchapters = pgTable(
  "subchapters",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("subchapters_chapter_slug_uq").on(t.chapterId, t.slug)]
);

export const sutras = pgTable(
  "sutras",
  {
    id: serial("id").primaryKey(),
    editionId: integer("edition_id")
      .notNull()
      .references(() => editions.id, { onDelete: "restrict" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "restrict" }),
    subchapterId: integer("subchapter_id").references(() => subchapters.id, { onDelete: "set null" }),
    /** Exactly as written: "42", "0.1.3". Unique within an edition. Used in URLs. */
    number: text("number").notNull(),
    /** Display order within the chapter (gaps allowed: 10, 20, 30 …). */
    position: integer("position").notNull(),
    sanskrit: text("sanskrit").notNull().default(""),
    /** Stored exactly as typed — never auto-converted. */
    transliteration: text("transliteration").notNull().default(""),
    synonyms: text("synonyms").notNull().default(""),
    vrtti: text("vrtti").notNull().default(""),
    translation: text("translation").notNull().default(""),
    extra: jsonb("extra").$type<ExtraFields>().notNull().default({}),
    /** Eligible for Verse of the Day rotation. */
    dailyEligible: boolean("daily_eligible").notNull().default(false),
    status: status(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: updatedBy(),
  },
  (t) => [
    uniqueIndex("sutras_edition_number_uq").on(t.editionId, t.number),
    index("sutras_chapter_position_idx").on(t.chapterId, t.position),
    index("sutras_subchapter_idx").on(t.subchapterId),
  ]
);

export const sutraNotes = pgTable("sutra_notes", {
  sutraId: integer("sutra_id")
    .primaryKey()
    .references(() => sutras.id, { onDelete: "cascade" }),
  /** Sanitized HTML (sanitized on write — see docs/04-admin.md §6). */
  html: text("html").notNull(),
  /** "gdoc-import" | "admin" */
  source: text("source").notNull().default("admin"),
  status: status(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  updatedBy: updatedBy(),
});

// ---------------------------------------------------------------------------
// Scriptures: books → (cantos) → chapters → verses
// ---------------------------------------------------------------------------
export const BOOK_STRUCTURES = ["canto_chapter_verse", "chapter_verse"] as const;

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  /** Lowercase URL code: "sb" | "bg". */
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  titleDeva: text("title_deva").notNull().default(""),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  structure: text("structure", { enum: BOOK_STRUCTURES }).notNull(),
  sort: integer("sort").notNull().default(0),
  status: status(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Bhāgavatam cantos. Books with structure "chapter_verse" have no rows here. */
export const cantos = pgTable(
  "cantos",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "restrict" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    /** Known total chapters (shown before all are entered). */
    expectedChapters: integer("expected_chapters"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("cantos_book_number_uq").on(t.bookId, t.number)]
);

export const scriptureChapters = pgTable(
  "scripture_chapters",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "restrict" }),
    /** Canto number for SB; 0 for books without cantos (keeps the unique index simple). */
    canto: integer("canto").notNull().default(0),
    number: integer("number").notNull(),
    title: text("title").notNull().default(""),
    subtitle: text("subtitle").notNull().default(""),
    status: status(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("scripture_chapters_book_canto_number_uq").on(t.bookId, t.canto, t.number)]
);

export const verses = pgTable(
  "verses",
  {
    id: serial("id").primaryKey(),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "restrict" }),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => scriptureChapters.id, { onDelete: "restrict" }),
    /** Denormalised for fast lookup by URL. 0 for books without cantos. */
    canto: integer("canto").notNull().default(0),
    chapter: integer("chapter").notNull(),
    /** Last URL segment: "1", "16-18". */
    verseKey: text("verse_key").notNull(),
    /** Full display number, exactly as the scripture states it: "1.12.1", "18.6". */
    verseNo: text("verse_no").notNull(),
    /** First verse number covered (for range lookups: "17" → "16-18"). */
    verseFrom: integer("verse_from").notNull(),
    /** Last verse number covered (= verseFrom for single verses). */
    verseTo: integer("verse_to").notNull(),
    position: integer("position").notNull(),
    iast: text("iast").notNull().default(""),
    devanagari: text("devanagari").notNull().default(""),
    extra: jsonb("extra").$type<ExtraFields>().notNull().default({}),
    dailyEligible: boolean("daily_eligible").notNull().default(false),
    status: status(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: updatedBy(),
  },
  (t) => [
    uniqueIndex("verses_book_canto_chapter_key_uq").on(t.bookId, t.canto, t.chapter, t.verseKey),
    index("verses_chapter_position_idx").on(t.chapterId, t.position),
    index("verses_range_idx").on(t.bookId, t.canto, t.chapter, t.verseFrom, t.verseTo),
  ]
);

// ---------------------------------------------------------------------------
// Cross-cutting: script overrides, audio
// ---------------------------------------------------------------------------
export const ENTITY_TYPES = ["sutra", "verse", "chapter", "scripture_chapter", "daily_item"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
export const SCRIPTS = ["devanagari", "iast", "bengali", "odia"] as const;
export type Script = (typeof SCRIPTS)[number];

/** Hand-written text for a field in a script where automatic conversion isn't good enough. */
export const scriptOverrides = pgTable(
  "script_overrides",
  {
    id: serial("id").primaryKey(),
    entityType: text("entity_type", { enum: ENTITY_TYPES }).notNull(),
    entityId: integer("entity_id").notNull(),
    /** "sanskrit", "vrtti", "devanagari", or a custom field key. */
    fieldKey: text("field_key").notNull(),
    script: text("script", { enum: SCRIPTS }).notNull(),
    text: text("text").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: updatedBy(),
  },
  (t) => [
    uniqueIndex("script_overrides_uq").on(t.entityType, t.entityId, t.fieldKey, t.script),
  ]
);

/** Audio is links only — this table never stores files. */
export const audioLinks = pgTable(
  "audio_links",
  {
    id: serial("id").primaryKey(),
    entityType: text("entity_type", { enum: ENTITY_TYPES }).notNull(),
    entityId: integer("entity_id").notNull(),
    title: text("title").notNull(),
    speaker: text("speaker").notNull().default(""),
    url: text("url").notNull(),
    sort: integer("sort").notNull().default(0),
    status: status(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: updatedBy(),
  },
  (t) => [index("audio_links_entity_idx").on(t.entityType, t.entityId)]
);

// ---------------------------------------------------------------------------
// Home page, daily pools, /more posts, site settings
// ---------------------------------------------------------------------------
export const homeBlocks = pgTable("home_blocks", {
  id: serial("id").primaryKey(),
  /** Slot / renderer name, e.g. "announcement", "feature-card", "quote". */
  kind: text("kind").notNull(),
  title: text("title").notNull().default(""),
  bodyHtml: text("body_html").notNull().default(""),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  sort: integer("sort").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  updatedBy: updatedBy(),
});

export const DAILY_POOLS = ["subhashita"] as const;

/**
 * Daily Subhāṣita entries (standalone text). Verse of the Day uses
 * `daily_eligible` on sutras/verses plus `daily_pins` below.
 */
export const dailyItems = pgTable("daily_items", {
  id: serial("id").primaryKey(),
  pool: text("pool", { enum: DAILY_POOLS }).notNull().default("subhashita"),
  sanskrit: text("sanskrit").notNull(),
  iast: text("iast").notNull().default(""),
  translation: text("translation").notNull().default(""),
  source: text("source").notNull().default(""),
  status: status(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  updatedBy: updatedBy(),
});

export const PIN_POOLS = ["verse_of_day", "subhashita"] as const;

/** Force a specific item on a specific calendar date. */
export const dailyPins = pgTable(
  "daily_pins",
  {
    id: serial("id").primaryKey(),
    pool: text("pool", { enum: PIN_POOLS }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    entityType: text("entity_type", { enum: ENTITY_TYPES }).notNull(),
    entityId: integer("entity_id").notNull(),
    createdAt: createdAt(),
    updatedBy: updatedBy(),
  },
  (t) => [uniqueIndex("daily_pins_pool_date_uq").on(t.pool, t.date)]
);

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  section: text("section").notNull().default(""),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  bodyHtml: text("body_html").notNull().default(""),
  sort: integer("sort").notNull().default(0),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  status: status(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  updatedBy: updatedBy(),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: updatedAt(),
  updatedBy: updatedBy(),
});

// ---------------------------------------------------------------------------
// Practice
// ---------------------------------------------------------------------------
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const PRACTICE_TYPES = ["sandhi", "viccheda"] as const;

export const practiceTopics = pgTable(
  "practice_topics",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    /** Sūtra range the topic covers, e.g. "41" … "60". */
    sutraFrom: text("sutra_from"),
    sutraTo: text("sutra_to"),
    sort: integer("sort").notNull().default(0),
    status: status(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("practice_topics_chapter_slug_uq").on(t.chapterId, t.slug)]
);

export const practiceQuestions = pgTable(
  "practice_questions",
  {
    id: serial("id").primaryKey(),
    topicId: integer("topic_id")
      .notNull()
      .references(() => practiceTopics.id, { onDelete: "restrict" }),
    /** Stable human id from the original bank: "v1", "c3", "s11". */
    code: text("code").notNull().unique(),
    difficulty: text("difficulty", { enum: DIFFICULTIES }).notNull(),
    /** "sandhi" (join) | "viccheda" (split). New types may be added later. */
    type: text("type").notNull(),
    prompt: text("prompt").notNull(),
    promptSub: text("prompt_sub").notNull().default(""),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull(),
    /** Sūtra numbers that justify the answer — required, never empty. */
    sutraRefs: text("sutra_refs").array().notNull(),
    status: status(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    updatedBy: updatedBy(),
  },
  (t) => [index("practice_questions_topic_idx").on(t.topicId)]
);

// ---------------------------------------------------------------------------
// Revisions (history + undo for every content edit)
// ---------------------------------------------------------------------------
export const REVISION_ACTIONS = ["create", "update", "delete", "restore", "import"] as const;

export const revisions = pgTable(
  "revisions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** Table name, e.g. "sutras". */
    entityTable: text("entity_table").notNull(),
    entityId: integer("entity_id").notNull(),
    action: text("action", { enum: REVISION_ACTIONS }).notNull(),
    /** Full row BEFORE the change (null for create). */
    before: jsonb("before"),
    /** Full row AFTER the change (null for delete). */
    after: jsonb("after"),
    userId: integer("user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    note: text("note").notNull().default(""),
    createdAt: createdAt(),
  },
  (t) => [index("revisions_entity_idx").on(t.entityTable, t.entityId, t.createdAt)]
);

// ---------------------------------------------------------------------------
// Phase 9 tables (reader accounts, notes, bookmarks) are NOT created yet.
// See docs/11-future-modules.md for their planned shape; they are added by
// their own migration when that phase starts.
// ---------------------------------------------------------------------------
