// The ONLY place cache-tag strings are built (docs/01-architecture.md §3.2).
// Reads tag their cached data with these; admin actions revalidate them.
export const tags = {
  hnvAll: "hnv",
  hnvChapter: (edition: string, slug: string) => `hnv:${edition}:ch:${slug}`,
  hnvSutra: (edition: string, num: string) => `hnv:${edition}:su:${num}`,
  scrAll: "scr",
  scriptureBook: (code: string) => `scr:${code}`,
  scriptureChapter: (code: string, canto: number, ch: number) => `scr:${code}:${canto}:${ch}`,
  home: "home",
  daily: "daily",
  practice: "practice",
  posts: "posts",
  more: "more",
  settings: "settings",
  admin: "admin",
} as const;
