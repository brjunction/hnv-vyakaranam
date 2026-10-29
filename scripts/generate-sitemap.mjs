#!/usr/bin/env node
// Generates public/sitemap.xml and public/robots.txt as PLAIN STATIC FILES,
// written to disk before `next build` runs (wired up as the "prebuild" npm
// script). This is deliberate: a sitemap produced by a serverless function
// (app/sitemap.ts) can fail at request time in production for boring reasons
// (a locked-down file bundle, a cold-start error, a transient 500) and
// Google Search Console will then report "couldn't fetch" / "no sitemap
// found" — exactly the symptom that prompted this script. A plain static
// file under /public can't do that: Vercel's CDN serves it byte-for-byte,
// every time, with no code running at all.
//
// Run automatically by `npm run build` (via the "prebuild" script in
// package.json). You can also run it by hand any time:
//   node scripts/generate-sitemap.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const SITE_URL = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf-8")).siteUrl;

const urls = []; // { loc, lastmod, changefreq, priority }
const today = new Date().toISOString().slice(0, 10);

function add(loc, { lastmod = today, changefreq = "monthly", priority = 0.5 } = {}) {
  urls.push({ loc: `${SITE_URL}${loc}`, lastmod, changefreq, priority });
}

function fileDate(p) {
  try {
    return fs.statSync(p).mtime.toISOString().slice(0, 10);
  } catch {
    return today;
  }
}

// ---------------------------------------------------------------------------
// Static pages
// ---------------------------------------------------------------------------
add("/", { changefreq: "weekly", priority: 1.0 });
add("/chapters", { changefreq: "weekly", priority: 0.9 });
add("/scriptures", { changefreq: "weekly", priority: 0.9 });
add("/scriptures/read", { changefreq: "monthly", priority: 0.4 });
add("/scriptures/syllabus", { changefreq: "yearly", priority: 0.6 });
add("/songs", { changefreq: "weekly", priority: 0.85 });
add("/hnv-wiki", { changefreq: "monthly", priority: 0.8, lastmod: fileDate(path.join(ROOT, "public/hnv-wiki.html")) });
add("/about", { changefreq: "monthly", priority: 0.6 });
add("/about/contact", { changefreq: "yearly", priority: 0.4 });
add("/more", { changefreq: "daily", priority: 0.7 });
add("/practice", { changefreq: "weekly", priority: 0.8 });
for (const g of ["rama-ravana", "lanka-dash", "sandhi-forge", "nama-grid", "rule-sorter", "case-blitz", "varna-order", "sutra-order"]) add(`/practice/games/${g}`, { changefreq: "monthly", priority: g === "rama-ravana" ? 0.7 : 0.6 });
add("/tools", { changefreq: "monthly", priority: 0.7 });
add("/tools/dictionary/search", { changefreq: "weekly", priority: 0.9 });
add("/scriptures/search", { changefreq: "monthly", priority: 0.5 });

// ---------------------------------------------------------------------------
// HNV chapters — read from the database (Neon) when DATABASE_URL is set,
// which it is on every Vercel build. Falls back to the known Madhyama
// chapters so the sitemap can never come out empty.
// ---------------------------------------------------------------------------
const EDITION_BASE = { madhyama: "/chapters", brhat: "/brhat/chapters", laghu: "/laghu/chapters" };
const FALLBACK_SLUGS = [
  "mangalacarana",
  "samjna-sandhi-prakarana",
  "nama-prakarana",
  "akhyata-prakarana",
  "karaka-prakarana",
  "krdanta-prakarana",
  "samasa-prakarana",
  "taddhita-prakarana",
  "afterword",
];

async function hnvChapterUrls() {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const { neon } = await import("@neondatabase/serverless");
      const sql = neon(url);
      const rows = await sql`
        select e.slug as edition, c.slug, to_char(greatest(c.updated_at, coalesce(max(s.updated_at), c.updated_at)), 'YYYY-MM-DD') as lastmod
        from chapters c
        join editions e on e.id = c.edition_id and e.is_published
        left join sutras s on s.chapter_id = c.id
        where c.status = 'published'
        group by e.slug, e.sort, c.slug, c.sort, c.updated_at
        order by e.sort, c.sort`;
      const out = rows
        .filter((r) => EDITION_BASE[r.edition])
        .map((r) => ({ loc: `${EDITION_BASE[r.edition]}/${r.slug}`, lastmod: r.lastmod }));
      if (out.length) return out;
    } catch (err) {
      console.warn("[sitemap] database not reachable, using the fallback chapter list:", err.message);
    }
  }
  return FALLBACK_SLUGS.map((slug) => ({ loc: `/chapters/${slug}`, lastmod: today }));
}

add("/brhat/chapters", { changefreq: "weekly", priority: 0.6 });
add("/laghu/chapters", { changefreq: "weekly", priority: 0.6 });
for (const c of await hnvChapterUrls()) {
  add(c.loc, { changefreq: "weekly", priority: 0.8, lastmod: c.lastmod });
}

// Practice pages exist only for prakaraṇas that have published questions.
async function practiceUrls() {
  const url = process.env.DATABASE_URL;
  if (!url) return [];
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const rows = await sql`
      select distinct c.slug from practice_questions q
      join practice_topics t on t.id = q.topic_id and t.status = 'published'
      join chapters c on c.id = t.chapter_id
      where q.status = 'published'`;
    return rows.map((r) => ({ loc: `/practice/${r.slug}`, priority: 0.6, changefreq: "weekly" }));
  } catch (err) {
    console.warn("[sitemap] practice not reachable:", err.message);
    return [];
  }
}
for (const u of await practiceUrls()) add(u.loc, u);

// Every sūtra has its own page (/sutras/42, /brhat/sutras/…, /laghu/sutras/…).
async function sutraUrls() {
  const url = process.env.DATABASE_URL;
  if (!url) return [];
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const rows = await sql`
      select e.slug as edition, s.number, to_char(s.updated_at, 'YYYY-MM-DD') as lastmod
      from sutras s
      join editions e on e.id = s.edition_id and e.is_published
      join chapters c on c.id = s.chapter_id and c.status = 'published'
      where s.status = 'published'
      order by e.sort, c.sort, s.position`;
    const base = { madhyama: "/sutras", brhat: "/brhat/sutras", laghu: "/laghu/sutras" };
    return rows.filter((r) => base[r.edition]).map((r) => ({ loc: `${base[r.edition]}/${encodeURIComponent(r.number)}`, lastmod: r.lastmod, priority: 0.7, changefreq: "monthly" }));
  } catch (err) {
    console.warn("[sitemap] sutras not reachable:", err.message);
    return [];
  }
}
for (const u of await sutraUrls()) add(u.loc, u);

// ---------------------------------------------------------------------------
// Scriptures — from the database: every book, every division (canto,
// chapter …) and every verse is its own indexable URL.
// ---------------------------------------------------------------------------
async function scriptureUrls() {
  const url = process.env.DATABASE_URL;
  if (!url) return [];
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const books = await sql`select id, code, to_char(updated_at, 'YYYY-MM-DD') as lastmod from books where status = 'published' order by sort, id`;
    const out = [];
    for (const b of books) {
      out.push({ loc: `/scriptures/${b.code}`, lastmod: b.lastmod, priority: 0.85, changefreq: "weekly" });
      const divs = await sql`select id, parent_id, key, to_char(updated_at, 'YYYY-MM-DD') as lastmod from scripture_divisions where book_id = ${b.id} and status = 'published' order by position, id`;
      const byId = new Map(divs.map((d) => [d.id, d]));
      const pathOf = (id) => {
        const parts = [];
        let cur = byId.get(id);
        for (let i = 0; cur && i < 20; i++) {
          parts.unshift(cur.key);
          if (cur.parent_id == null) return parts;
          cur = byId.get(cur.parent_id);
        }
        return null; // an ancestor is unpublished
      };
      for (const d of divs) {
        const p = pathOf(d.id);
        if (p) out.push({ loc: `/scriptures/${b.code}/${p.join("/")}`, lastmod: d.lastmod, priority: 0.75, changefreq: "weekly" });
      }
      const verses = await sql`select division_id, key, to_char(updated_at, 'YYYY-MM-DD') as lastmod from scripture_verses where book_id = ${b.id} and status = 'published'`;
      for (const v of verses) {
        const p = pathOf(v.division_id);
        if (p) out.push({ loc: `/scriptures/${b.code}/${p.join("/")}/${v.key}`, lastmod: v.lastmod, priority: 0.6, changefreq: "monthly" });
      }
    }
    return out;
  } catch (err) {
    console.warn("[sitemap] scriptures not reachable:", err.message);
    return [];
  }
}
for (const u of await scriptureUrls()) add(u.loc, u);

// Songs — every song and every book of songs.
async function songUrls() {
  const url = process.env.DATABASE_URL;
  if (!url) return [];
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const rows = await sql`select slug, book, to_char(updated_at, 'YYYY-MM-DD') as lastmod from songs where status = 'published'`;
    const out = rows.map((r) => ({ loc: `/songs/${r.slug}`, lastmod: r.lastmod, priority: 0.7, changefreq: "monthly" }));
    for (const b of [...new Set(rows.map((r) => r.book).filter(Boolean))]) out.push({ loc: `/songs/book/${encodeURIComponent(b)}`, priority: 0.6, changefreq: "weekly" });
    return out;
  } catch (err) {
    console.warn("[sitemap] songs not reachable:", err.message);
    return [];
  }
}
for (const u of await songUrls()) add(u.loc, u);

// More page — every section and every item with its own page.
async function moreUrls() {
  const url = process.env.DATABASE_URL;
  if (!url) return [];
  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    const secs = await sql`select id, key, kind, to_char(updated_at, 'YYYY-MM-DD') as lastmod from more_sections where is_visible`;
    const items = await sql`select section_id, slug, body_html, to_char(updated_at, 'YYYY-MM-DD') as lastmod from more_items where status = 'published'`;
    const base = (k) => (k.startsWith("about-") ? `/about/${k.slice(6)}` : `/more/${k}`);
    const out = secs.map((s) => ({ loc: base(s.key), lastmod: s.lastmod, priority: 0.6, changefreq: "weekly" }));
    for (const i of items) {
      const s = secs.find((x) => x.id === i.section_id);
      if (s && ((s.kind === "posts" && !s.key.startsWith("about-")) || (i.body_html ?? "").trim())) out.push({ loc: `${base(s.key)}/${i.slug}`, lastmod: i.lastmod, priority: 0.5, changefreq: "monthly" });
    }
    return out;
  } catch (err) {
    console.warn("[sitemap] more not reachable:", err.message);
    return [];
  }
}
for (const u of await moreUrls()) add(u.loc, u);

// ---------------------------------------------------------------------------
// Write files
// ---------------------------------------------------------------------------
const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${u.loc}</loc>\n` +
        `    <lastmod>${u.lastmod}</lastmod>\n` +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority.toFixed(1)}</priority>\n` +
        `  </url>\n`
    )
    .join("") +
  `</urlset>\n`;

const publicDir = path.join(ROOT, "public");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), xml, "utf-8");

const robots =
  `User-agent: *\n` +
  `Allow: /\n` +
  `Disallow: /api/\n\n` +
  `Sitemap: ${SITE_URL}/sitemap.xml\n`;
fs.writeFileSync(path.join(publicDir, "robots.txt"), robots, "utf-8");

console.log(`generate-sitemap: wrote ${urls.length} URLs to public/sitemap.xml and public/robots.txt`);
