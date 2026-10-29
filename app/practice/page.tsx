import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gamepad2 } from "lucide-react";
import { getPracticeData } from "@/lib/data/practice";
import { SectionIcon } from "@/components/practice/icons";
import { SECTIONS } from "@/lib/practice/sections";
import { ART, GameLogo } from "@/components/games/GameArt";
import { GAMES } from "@/lib/practice/games";
import HeroSky from "@/components/home/HeroSky";
import Reveal from "@/components/home/Reveal";

export const revalidate = 86400; // admin saves refresh it immediately

export const metadata: Metadata = {
  alternates: { canonical: "/practice" },
  title: "Practice",
  description: "Practise Hari-nāmāmṛta-vyākaraṇa: Sandhi, Nāma, Ākhyāta and more — easy, medium and hard — and play Sanskrit grammar games like the Rāma–Rāvaṇa battle.",
};

export default async function PracticePage() {
  const data = await getPracticeData();
  const by = new Map(data.chapters.map((c) => [c.slug, c]));
  const qCount = (slug: string) => data.questions.filter((q) => q.chapter === slug).length;
  return (
    <>
      <Reveal />
      <section className="pq-hub-hero relative overflow-hidden border-b border-[var(--border)]">
        <HeroSky />
        <div className="relative mx-auto max-w-5xl px-5 py-14 text-center sm:py-20">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)]">Practice</p>
          <h1 className="hero-title font-devanagari text-4xl leading-tight sm:text-6xl">अभ्यासः</h1>
          <p className="mx-auto mt-3 max-w-xl text-[var(--fg-muted)]">Pick a prakaraṇa and a level, or play a game. Every answer shows the sūtra behind it.</p>
          <p className="mt-5 inline-flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-[var(--fg-muted)]">
            <span><b className="text-[var(--accent)]">{data.questions.length}</b> questions</span>
            <span><b className="text-[var(--accent)]">{SECTIONS.length}</b> prakaraṇas open</span>
            <span><b className="text-[var(--accent)]">{GAMES.length}</b> games</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <h2 className="mb-1 text-xl font-semibold sm:text-2xl">Learn by prakaraṇa</h2>
        <p className="mb-7 text-sm text-[var(--fg-muted)]">Each prakaraṇa has its own questions — Sandhi, Nāma and the rest are practised separately.</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s, i) => {
            const c = by.get(s.slug);
            const has = !!c?.available;
            const body = (
              <>
                <span className="pq-card-glow" aria-hidden />
                <span className="pq-card-icon"><SectionIcon name={s.icon} size={26} /></span>
                <p className="font-devanagari text-2xl leading-tight">{s.deva}</p>
                <p className="mt-0.5 font-medium">{s.short}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">{s.tagline}</p>
                <p className="mt-4 flex items-center justify-between text-sm">
                  <span className="tabular-nums text-[var(--fg-muted)]">
                    {has ? `${qCount(s.slug)} questions · ${c!.topics.length} topic${c!.topics.length === 1 ? "" : "s"}` : "Questions are being added"}
                  </span>
                  <span className="pq-go inline-flex items-center gap-1 font-semibold" style={{ color: s.color }}>{has ? "Practise" : "Open"} <ArrowRight size={15} /></span>
                </p>
              </>
            );
            const style = { ["--c" as string]: s.color, animationDelay: `${i * 80}ms` };
            return (
              <Link key={s.slug} href={`/practice/${s.slug}`} className="pq-card pq-in" style={style}>{body}</Link>
            );
          })}
        </div>
      </section>

      <section className="reveal border-t border-[var(--border)] bg-[var(--bg-2)]">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold sm:text-2xl"><Gamepad2 size={22} className="text-[var(--accent)]" /> Play</h2>
          <p className="mb-7 text-sm text-[var(--fg-muted)]">Eight different games — battle, run, build, fill, sort, blitz and order — all made to teach the grammar. Choose any prakaraṇa to play with.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((g) => (
              <Link key={g.href} href={g.href} className="pq-game" style={{ ["--c" as string]: g.color }}>
                <span className="pq-game-art relative">{ART[g.id]()}<span className="absolute -bottom-5 right-3 rounded-full bg-[var(--bg)] p-1 shadow-lg"><GameLogo game={g.id} size={48} /></span></span>
                <span className="block p-4">
                  <span className="flex items-center justify-between"><span className="font-devanagari text-lg" style={{ color: g.color }}>{g.deva}</span><span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--fg-muted)]">{g.kind}</span></span>
                  <span className="block font-semibold">{g.title}</span>
                  <span className="mt-1 block text-sm text-[var(--fg-muted)]">{g.text}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: g.color }}>Play now <ArrowRight size={15} /></span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
