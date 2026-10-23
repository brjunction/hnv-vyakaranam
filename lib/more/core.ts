// Shared (client-safe) types and helpers for the "More" page.

export type MoreKind = "posts" | "progress" | "courses" | "videos" | "links";
export type MoreStage = "" | "done" | "doing" | "planned";

export type MoreItem = {
  id: number;
  sectionId: number;
  slug: string;
  title: string;
  subtitle: string;
  bodyHtml: string;
  url: string;
  linkLabel: string;
  imageUrl: string;
  person: string;
  badge: string;
  stage: MoreStage;
  date: string | null;
  pinned: boolean;
  status: string;
};

export type MoreSection = {
  id: number;
  key: string;
  title: string;
  intro: string;
  kind: MoreKind;
  isVisible: boolean;
  items: MoreItem[];
};

export const KIND_INFO: Record<MoreKind, { label: string; hint: string; noun: string }> = {
  posts: { label: "Blog & updates", hint: "Articles with their own page: news, essays, announcements.", noun: "post" },
  progress: { label: "Development progress", hint: "A timeline of what is done, in progress and planned.", noun: "milestone" },
  courses: { label: "Courses", hint: "Online courses with teacher, picture and a link to join.", noun: "course" },
  videos: { label: "YouTube playlists", hint: "Playlists or single videos, played right on the page.", noun: "playlist" },
  links: { label: "Resources", hint: "Books, PDFs, websites and apps, as link cards.", noun: "resource" },
};

export const STAGE_INFO: Record<Exclude<MoreStage, "">, { label: string }> = {
  done: { label: "Done" },
  doing: { label: "In progress" },
  planned: { label: "Planned" },
};

/** Does this item get its own page at /more/<section>/<slug>? */
export const hasPage = (kind: MoreKind, item: Pick<MoreItem, "bodyHtml">) => kind === "posts" || item.bodyHtml.trim().length > 0;

export const itemPath = (sectionKey: string, slug: string) => `/more/${sectionKey}/${slug}`;

/** YouTube link → { playlist?, video? } ids (playlist, watch, youtu.be, embed, shorts). */
export function parseYouTube(url: string): { list?: string; video?: string } | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (!/(^|\.)youtube\.com$|^youtu\.be$|^youtube-nocookie\.com$/.test(host)) return null;
    const list = u.searchParams.get("list") ?? undefined;
    let video = u.searchParams.get("v") ?? undefined;
    if (host === "youtu.be") video = u.pathname.slice(1).split("/")[0] || undefined;
    const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
    if (m && m[1] !== "videoseries") video = m[1];
    if (!list && !video) return null;
    return { list, video };
  } catch {
    return null;
  }
}

export function formatDate(d: string | null, style: "long" | "month" = "long") {
  if (!d) return "";
  const dt = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("en-GB", style === "month" ? { month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Order items: pinned first, then manual order. */
export function ordered<T extends { pinned: boolean }>(items: T[]) {
  return [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned));
}
