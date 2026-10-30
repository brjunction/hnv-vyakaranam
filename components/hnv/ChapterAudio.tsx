"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Pause, Play, SkipForward } from "lucide-react";
import type { PublicChapter } from "@/lib/data/hnv";

/**
 * Recitation of a chapter: the chapter's own links, then every section's, one
 * after another ("Play chapter recitation"); or one section on its own.
 * Audio is only linked (never stored here).
 */
export default function ChapterAudio({ chapter }: { chapter: PublicChapter }) {
  const tracks = [
    ...(chapter.audio ?? []).map((url, i, a) => ({ url, label: a.length > 1 ? `Whole chapter · part ${i + 1}` : "Whole chapter", section: "" })),
    ...chapter.sections.flatMap((s) => (s.audio ?? []).map((url, i, a) => ({ url, label: a.length > 1 ? `${s.title} · ${i + 1}` : s.title, section: s.slug }))),
  ];
  const ref = useRef<HTMLAudioElement>(null);
  const [at, setAt] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [single, setSingle] = useState(false);
  useEffect(() => {
    const a = ref.current;
    if (!a || at < 0) return;
    a.src = tracks[at].url;
    a.play().catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);
  if (!tracks.length) return null;
  const playAll = () => {
    setSingle(false);
    if (at < 0) setAt(0);
    else ref.current?.play();
  };
  return (
    <section className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-4" aria-label="Recitation">
      <div className="flex flex-wrap items-center gap-2">
        <Headphones size={18} className="text-[var(--accent)]" />
        <span className="mr-auto font-semibold">Recitation</span>
        {playing ? (
          <button type="button" className="ui-btn" onClick={() => ref.current?.pause()}>
            <Pause size={15} /> Pause
          </button>
        ) : (
          <button type="button" className="ui-btn ui-btn-primary" onClick={playAll}>
            <Play size={15} /> Play chapter recitation
          </button>
        )}
        {at >= 0 && at < tracks.length - 1 && (
          <button type="button" className="ui-icon-btn" onClick={() => setAt(at + 1)} title="Next" aria-label="Next">
            <SkipForward size={15} />
          </button>
        )}
      </div>
      <audio
        ref={ref}
        controls
        preload="none"
        className="mt-3 w-full"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => (!single && at < tracks.length - 1 ? setAt(at + 1) : setPlaying(false))}
      />
      <ol className="mt-2 grid gap-1 text-sm">
        {tracks.map((t, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => {
                setSingle(!!t.section);
                if (i === at) ref.current?.play();
                else setAt(i);
              }}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left hover:bg-[var(--bg)] ${i === at ? "font-semibold text-[var(--accent)]" : ""}`}
            >
              <Play size={12} /> {t.label}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
