import type { PrabhupadaBlock } from "@/lib/data/home";

// Śrīla Prabhupāda on Hari-nāmāmṛta-vyākaraṇa: a large portrait on one side,
// his words on the other — each quote marked with an edition watermark
// (बृहत् · लघु).

const MARKS = ["बृहत्", "लघु"];

function mark(t: string) {
  return t.split(/((?:Laghu-hari-|Bṛhad-dhari-|Hari-)nāmāmṛta-vyākaraṇa)/).map((p, i) =>
    /nāmāmṛta-vyākaraṇa$/.test(p) ? (
      <span key={i} className="prabhu-hl">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function PrabhupadaQuote({ b }: { b: PrabhupadaBlock }) {
  const name = b.author || "Śrīla Prabhupāda";
  return (
    <section className="prabhu-band reveal" aria-labelledby="prabhu-heading">
      <div className={`mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:py-16 ${b.imageUrl ? "lg:grid-cols-[18rem_1fr] lg:gap-12" : "max-w-3xl"}`}>
        {b.imageUrl && (
          <figure className="prabhu-photo mx-auto aspect-[4/5] w-full max-w-[18rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl} alt={name} loading="lazy" />
            <figcaption className="prabhu-cap">
              <span className="block text-lg font-semibold leading-snug">Śrīla Prabhupāda</span>
              <span className="text-xs opacity-85">Founder-Ācārya of ISKCON</span>
            </figcaption>
          </figure>
        )}
        <div>
          <p className="prabhu-tag">In the words of</p>
          <h2 id="prabhu-heading" className="mb-5 text-xl font-semibold leading-tight sm:text-2xl">
            {name}
          </h2>
          {b.quotes.map((q, i) => (
            <figure key={i} className="prabhu-q">
              <span className="prabhu-water font-devanagari" aria-hidden>
                {MARKS[i % MARKS.length]}
              </span>
              <blockquote className="prabhu-quote relative">“{mark(q.text)}”</blockquote>
              {q.source && <figcaption className="relative mt-3 text-sm text-[var(--fg-muted)]">— {q.source}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
