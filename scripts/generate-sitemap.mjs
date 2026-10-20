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
import * as XLSXNS from "xlsx";
// Plain Node ESM interop with xlsx's CJS build can land the real exports on
// `.default` instead of the namespace itself — cover both.
const XLSX = XLSXNS.readFile ? XLSXNS : XLSXNS.default;

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
add("/anvyaya", { changefreq: "weekly", priority: 0.9 });
add("/hnv-wiki", { changefreq: "monthly", priority: 0.8, lastmod: fileDate(path.join(ROOT, "public/hnv-wiki.html")) });
add("/about", { changefreq: "monthly", priority: 0.6 });
add("/more", { changefreq: "daily", priority: 0.7 });

// ---------------------------------------------------------------------------
// HNV chapters — content/chapters/<slug>.xlsx
// (Mirrors the CHAPTER_META list in lib/content.ts. If you add a chapter
// there, add its slug here too so it gets into the sitemap.)
// ---------------------------------------------------------------------------
const HNV_SLUGS = [
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
const HNV_DIR = path.join(ROOT, "content/chapters");
for (const slug of HNV_SLUGS) {
  const file = path.join(HNV_DIR, `${slug}.xlsx`);
  if (!fs.existsSync(file)) continue;
  add(`/chapters/${slug}`, { changefreq: "weekly", priority: 0.8, lastmod: fileDate(file) });
}

// ---------------------------------------------------------------------------
// Scripture Anvyayas — content/anvyaya/{sb,bg}/*.xlsx
// Every canto/chapter page AND every individual verse page is a real,
// separate URL, so every verse ends up in the sitemap and is individually
// indexable by Google.
// ---------------------------------------------------------------------------
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const COLS = {
  chapterNo: ["chapterno", "chapternumber", "chno"],
  verseNo: ["verseno", "versenumber", "verse"],
};
function columnMap(headerRow) {
  const cells = headerRow.map(norm);
  const map = {};
  for (const [key, names] of Object.entries(COLS)) {
    const idx = cells.findIndex((c) => names.includes(c));
    if (idx !== -1) map[key] = idx;
  }
  return map;
}

function readVerseKeys(filePath, hasChapters, fileDivision) {
  let wb;
  try {
    wb = XLSX.readFile(filePath);
  } catch {
    return [];
  }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet || !sheet["!ref"]) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: true, defval: "" });
  if (rows.length < 2) return [];
  const col = columnMap(rows[0]);
  if (col.verseNo === undefined) return [];

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const raw = String(rows[i][col.verseNo] ?? "").trim();
    if (!raw) continue;
    const parts = raw.split(".").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) continue;

    if (hasChapters) {
      // SB: division.chapter.verse, or chapter.verse (division from file name)
      let division = fileDivision;
      let chapter;
      let verseKey;
      if (parts.length >= 3) {
        division = parseInt(parts[0], 10);
        chapter = parseInt(parts[1], 10);
        verseKey = parts.slice(2).join(".");
      } else if (parts.length === 2) {
        chapter = parseInt(parts[0], 10);
        verseKey = parts[1];
      } else {
        const chCol = col.chapterNo !== undefined ? parseInt(String(rows[i][col.chapterNo]).trim(), 10) : NaN;
        chapter = Number.isFinite(chCol) ? chCol : fileDivision;
        verseKey = parts[0];
      }
      if (!Number.isFinite(division) || !Number.isFinite(chapter)) continue;
      out.push({ division, chapter, verseKey });
    } else {
      // BG: chapter.verse
      let chapter;
      let verseKey;
      if (parts.length >= 2) {
        chapter = parseInt(parts[0], 10);
        verseKey = parts.slice(1).join(".");
      } else {
        chapter = fileDivision;
        verseKey = parts[0];
      }
      if (!Number.isFinite(chapter)) continue;
      out.push({ division: chapter, chapter, verseKey });
    }
  }
  return out;
}

const BOOKS = [
  { code: "SB", dir: "sb", hasChapters: true, divisionCount: 12 },
  { code: "BG", dir: "bg", hasChapters: false, divisionCount: 18 },
];

for (const book of BOOKS) {
  const dir = path.join(ROOT, "content/anvyaya", book.dir);
  if (!fs.existsSync(dir)) continue;

  const bookLastmod = fs
    .readdirSync(dir)
    .filter((f) => /\.xlsx$/i.test(f))
    .reduce((latest, f) => {
      const d = fileDate(path.join(dir, f));
      return d > latest ? d : latest;
    }, today.slice(0, 4) + "-01-01");

  add(`/anvyaya/${book.code}`, { changefreq: "weekly", priority: 0.85, lastmod: bookLastmod });

  for (let n = 1; n <= book.divisionCount; n++) {
    const re = new RegExp(`^${book.dir}[-_ ]?0*${n}(?!\\d)`, "i");
    const files = fs
      .readdirSync(dir)
      .filter((f) => /\.xlsx$/i.test(f) && !f.startsWith("~$") && re.test(f))
      .map((f) => path.join(dir, f));
    if (files.length === 0) continue;

    const divisionLastmod = files.reduce((latest, f) => {
      const d = fileDate(f);
      return d > latest ? d : latest;
    }, bookLastmod);

    add(`/anvyaya/${book.code}/${n}`, { changefreq: "weekly", priority: 0.8, lastmod: divisionLastmod });

    const verses = files.flatMap((f) => readVerseKeys(f, book.hasChapters, n));
    const chapters = new Set(verses.map((v) => v.chapter));

    if (book.hasChapters) {
      for (const ch of chapters) {
        add(`/anvyaya/${book.code}/${n}/${ch}`, { changefreq: "monthly", priority: 0.7, lastmod: divisionLastmod });
      }
    }
    for (const v of verses) {
      const p = book.hasChapters
        ? `/anvyaya/${book.code}/${v.division}/${v.chapter}/${v.verseKey}`
        : `/anvyaya/${book.code}/${v.chapter}/${v.verseKey}`;
      add(p, { changefreq: "monthly", priority: 0.6, lastmod: divisionLastmod });
    }
  }
}

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
