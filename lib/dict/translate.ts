import "server-only";

// Turns a meaning-search query written in any language into English, so it
// can be matched against the English definitions. Official Google Cloud
// Translation is used when GOOGLE_TRANSLATE_API_KEY is set; otherwise the
// public Google Translate web endpoint is used. If translation fails or is
// slow, the original text is searched, so a search never fails because of it.

export type Translated = { text: string; from: string; changed: boolean };

const cache = new Map<string, Translated>();
const CACHE_MAX = 500;
const TIMEOUT_MS = 2500;

const remember = (k: string, v: Translated) => {
  cache.set(k, v);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
};

async function withTimeout(url: string, init?: RequestInit) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ac.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

async function official(q: string, key: string): Promise<Translated | null> {
  const res = await withTimeout(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q, target: "en", format: "text" }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { data?: { translations?: { translatedText: string; detectedSourceLanguage?: string }[] } };
  const t = j.data?.translations?.[0];
  if (!t) return null;
  const from = t.detectedSourceLanguage ?? "auto";
  return { text: t.translatedText, from, changed: from !== "en" };
}

async function publicEndpoint(q: string): Promise<Translated | null> {
  const res = await withTimeout(
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(q)}`
  );
  if (!res.ok) return null;
  const j = (await res.json()) as [[string, string][] | null, unknown, string];
  const text = (j[0] ?? []).map((p) => p[0]).join("").trim();
  if (!text) return null;
  const from = typeof j[2] === "string" ? j[2] : "auto";
  return { text, from, changed: from !== "en" };
}

export async function toEnglish(raw: string): Promise<Translated> {
  const q = raw.trim().slice(0, 120);
  const same: Translated = { text: q, from: "en", changed: false };
  if (!q || /^[\d\s.,;:!?-]+$/.test(q)) return same;
  const hit = cache.get(q.toLowerCase());
  if (hit) return hit;
  try {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    const out = (key ? await official(q, key) : null) ?? (await publicEndpoint(q)) ?? same;
    const final = out.changed && out.text.toLowerCase() === q.toLowerCase() ? { ...out, changed: false } : out;
    remember(q.toLowerCase(), final);
    return final;
  } catch {
    return same; // timeout or network: search the text as typed
  }
}
