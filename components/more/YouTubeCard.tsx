"use client";

import { useState } from "react";
import { ExternalLink, ListVideo, Play } from "lucide-react";
import { parseYouTube } from "@/lib/more/core";

// Lite YouTube embed: a picture + play button until clicked, then the
// privacy-enhanced player (youtube-nocookie). Nothing loads from YouTube
// until the reader asks for it.

export default function YouTubeCard({
  url, title, subtitle, person, badge, imageUrl,
}: { url: string; title: string; subtitle: string; person: string; badge: string; imageUrl: string }) {
  const [playing, setPlaying] = useState(false);
  const yt = parseYouTube(url);
  const thumb = imageUrl || (yt?.video ? `https://i.ytimg.com/vi/${yt.video}/hqdefault.jpg` : "");
  const src = yt
    ? yt.list
      ? `https://www.youtube-nocookie.com/embed/${yt.video ? `${yt.video}?list=${yt.list}&` : `videoseries?list=${yt.list}&`}autoplay=1&rel=0`
      : `https://www.youtube-nocookie.com/embed/${yt.video}?autoplay=1&rel=0`
    : "";

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-sm transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-video bg-[var(--bg-2)]">
        {playing && src ? (
          <iframe
            src={src}
            title={title}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => (src ? setPlaying(true) : window.open(url, "_blank", "noopener"))}
            className="absolute inset-0 flex h-full w-full items-center justify-center"
            aria-label={`Play ${title}`}
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
            ) : (
              <span className="more-video-fallback absolute inset-0" aria-hidden />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" aria-hidden />
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-[#c4302b] shadow-lg transition-transform group-hover:scale-110">
              <Play size={24} fill="currentColor" className="ml-0.5" />
            </span>
            {yt?.list && (
              <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                <ListVideo size={12} /> Playlist
              </span>
            )}
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 font-semibold leading-snug">{title}</h3>
          {badge && <span className="more-badge shrink-0">{badge}</span>}
        </div>
        {person && <p className="mt-0.5 text-xs text-[var(--fg-muted)]">{person}</p>}
        {subtitle && <p className="mt-1.5 line-clamp-2 text-sm text-[var(--fg-muted)]">{subtitle}</p>}
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-[var(--fg-muted)] hover:text-[var(--accent)]">
          Open on YouTube <ExternalLink size={12} />
        </a>
      </div>
    </article>
  );
}
