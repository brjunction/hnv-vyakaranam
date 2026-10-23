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
add("/hnv-wiki", { changefreq: "monthly", priority: 0.8, lastmod: fileDate(path.join(ROOT, "public/hnv-wiki.html")) });
add("/about", { changefreq: "monthly", priority: 0.6 });
add("/more", { changefreq: "daily", priority: 0.7 });

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
