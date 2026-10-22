#!/usr/bin/env python3
"""Emit idempotent SQL that imports HNV structure + sūtras into Neon.

Reads content/chapters/*.xlsx (the pre-database source) and the chapter
metadata below (copied from lib/content.ts CHAPTER_META). Writes a JSON array
of SQL statements to stdout, suitable for the Neon connector's
run_sql_transaction, or for psql (join with ';\n').

Re-running is safe: every insert is ON CONFLICT … DO UPDATE on the natural
key (docs/03-content-pipeline.md §2.2). Nothing is ever deleted.

Usage:  python3 scripts/db/emit-hnv-import-sql.py > /tmp/hnv-import.json
"""
import json, re, sys, unicodedata, pathlib
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[2]
CH_DIR = ROOT / "content" / "chapters"

# (slug, number, title, title_en, summary, range_label, kind)
CHAPTERS = [
  ("mangalacarana", None, "Maṅgalācaraṇa", "Invocation",
   "The opening invocatory verses of Śrīla Jīva Gosvāmī, including the celebrated verse in praise of Sarasvatī and Govinda.",
   "2+4 Verses", "verses"),
  ("samjna-sandhi-prakarana", 1, "Saṁjñā-sandhi-prakaraṇa", "Terminology & Phonetic Combination",
   "Defines core grammatical terms and the rules of sandhi (euphonic combination) used throughout the treatise.",
   "1–86", "sutras"),
  ("nama-prakarana", 2, "Nāma-prakaraṇa", "Noun Declension",
   "Rules governing the declension of nouns across the seven cases (vibhakti) and their forms.", "87–259", "sutras"),
  ("akhyata-prakarana", 3, "Ākhyāta-prakaraṇa", "Verb Conjugation",
   "The conjugation of verbal roots across tenses, moods, and voices — the section most fully preserved in the surviving manuscript.",
   "260–618", "sutras"),
  ("karaka-prakarana", 4, "Kāraka-prakaraṇa", "Case Meanings",
   "The semantic roles (kāraka) expressed by the case endings.", "619–727", "sutras"),
  ("krdanta-prakarana", 5, "Kṛdanta-prakaraṇa", "Participles & Kṛt-formations",
   "Participles and nouns derived from verbal roots by kṛt suffixes.", "728–913", "sutras"),
  ("samasa-prakarana", 6, "Samāsa-prakaraṇa", "Compounds",
   "The formation and classification of compound words (samāsa).", "914–1041", "sutras"),
  ("taddhita-prakarana", 7, "Taddhita-prakaraṇa", "Taddhita-formations",
   "Nouns derived by taddhita suffixes, along with the appendixes closing the treatise.", "1042–1278", "sutras"),
  ("afterword", None, "Afterword", "Afterword", "Closing reflections and colophon of the edition.", "7 Verses", "verses"),
]

def q(s):
    """SQL string literal."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def slugify(title: str) -> str:
    t = unicodedata.normalize("NFD", title)
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    t = re.sub(r"[^a-z0-9\s-]", "", t)
    t = re.sub(r"[\s_]+", "-", t.strip())
    return re.sub(r"-+", "-", t) or "general"

def norm_header(h):
    return re.sub(r"[\s_]+", " ", str(h or "").strip().lower())

ALIASES = {
    "section": ["subchapter", "section", "sub chapter", "sub-chapter"],
    "number": ["sutra number", "number", "sutra no", "sutra no."],
    "sanskrit": ["sanskrit", "sutra sanskrit"],
    "transliteration": ["transliteration", "sutra transliteration"],
    "vrtti": ["vrtti", "vṛtti", "commentary"],
    "translation": ["translation"],
}

def cell(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()

def read_chapter(slug):
    path = CH_DIR / f"{slug}.xlsx"
    if not path.exists():
        return [], []
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    hdr = [norm_header(h) for h in rows[0]]
    col = {k: next((i for i, h in enumerate(hdr) if h in names), None) for k, names in ALIASES.items()}
    subs, out = [], []
    for r in rows[1:]:
        g = lambda k: cell(r[col[k]]) if col[k] is not None and col[k] < len(r) else ""
        num = g("number")
        if not num:
            continue
        sub = g("section") or "General"
        if sub not in subs:
            subs.append(sub)
        out.append({"number": num, "sub": sub, "sanskrit": g("sanskrit"),
                    "translit": g("transliteration"), "vrtti": g("vrtti"), "translation": g("translation")})
    return subs, out

stmts = []
stmts.append(
    "INSERT INTO editions (slug, name, name_en, sort, is_published) VALUES "
    "('madhyama','Madhyama','Middle edition',10,true),"
    "('laghu','Laghu','Short edition',20,false),"
    "('brhat','Bṛhat','Large edition',30,false) "
    "ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, name_en=EXCLUDED.name_en, sort=EXCLUDED.sort"
)
vals = []
for i, (slug, num, title, title_en, summary, rng, kind) in enumerate(CHAPTERS):
    vals.append(f"({q(slug)},{'NULL' if num is None else num},{q(title)},{q(title_en)},{q(summary)},{q(kind)},{q(rng)},{(i+1)*10})")
stmts.append(
    "INSERT INTO chapters (edition_id, slug, number, title, title_en, summary, kind, range_label, sort) "
    "SELECT e.id, v.slug, v.number, v.title, v.title_en, v.summary, v.kind, v.range_label, v.sort "
    f"FROM (VALUES {','.join(vals)}) AS v(slug, number, title, title_en, summary, kind, range_label, sort) "
    "JOIN editions e ON e.slug='madhyama' "
    "ON CONFLICT (edition_id, slug) DO UPDATE SET number=EXCLUDED.number, title=EXCLUDED.title, title_en=EXCLUDED.title_en, "
    "summary=EXCLUDED.summary, kind=EXCLUDED.kind, range_label=EXCLUDED.range_label, sort=EXCLUDED.sort, updated_at=now()"
)

counts = {}
for slug, *_ in CHAPTERS:
    subs, rows = read_chapter(slug)
    counts[slug] = (len(subs), len(rows))
    if not rows:
        continue
    sv = ",".join(f"({q(slugify(s))},{q(s)},{(i+1)*10})" for i, s in enumerate(subs))
    stmts.append(
        "INSERT INTO subchapters (chapter_id, slug, title, sort) "
        f"SELECT c.id, v.slug, v.title, v.sort FROM (VALUES {sv}) AS v(slug, title, sort) "
        f"JOIN editions e ON e.slug='madhyama' JOIN chapters c ON c.edition_id=e.id AND c.slug={q(slug)} "
        "ON CONFLICT (chapter_id, slug) DO UPDATE SET title=EXCLUDED.title, sort=EXCLUDED.sort, updated_at=now()"
    )
    rv = ",".join(
        f"({q(r['number'])},{q(slugify(r['sub']))},{(i+1)*10},{q(r['sanskrit'])},{q(r['translit'])},{q(r['vrtti'])},{q(r['translation'])})"
        for i, r in enumerate(rows)
    )
    stmts.append(
        "INSERT INTO sutras (edition_id, chapter_id, subchapter_id, number, position, sanskrit, transliteration, vrtti, translation, daily_eligible) "
        "SELECT e.id, c.id, s.id, v.number, v.position, v.sanskrit, v.translit, v.vrtti, v.translation, true "
        f"FROM (VALUES {rv}) AS v(number, sub_slug, position, sanskrit, translit, vrtti, translation) "
        f"JOIN editions e ON e.slug='madhyama' JOIN chapters c ON c.edition_id=e.id AND c.slug={q(slug)} "
        "LEFT JOIN subchapters s ON s.chapter_id=c.id AND s.slug=v.sub_slug "
        "ON CONFLICT (edition_id, number) DO UPDATE SET chapter_id=EXCLUDED.chapter_id, subchapter_id=EXCLUDED.subchapter_id, "
        "position=EXCLUDED.position, sanskrit=EXCLUDED.sanskrit, transliteration=EXCLUDED.transliteration, "
        "vrtti=EXCLUDED.vrtti, translation=EXCLUDED.translation, updated_at=now()"
    )

json.dump(stmts, sys.stdout, ensure_ascii=False)
print(json.dumps(counts), file=sys.stderr)
