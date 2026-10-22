import Link from "next/link";
import { BookOpenText, ScrollText, Target } from "lucide-react";
import VarnaBoard from "@/components/home/VarnaBoard";
import DailyPanel from "@/components/home/DailyPanel";
import { chapters } from "@/lib/content";

// Home page. Server Component: everything interactive lives in small client
// children (VarnaBoard, DailyPanel). No event handlers in this file.

const PRAYERS = [
  {
    deva: ["स्वल्पायुषां कलियुगेऽत्र नृणां शमिच्छन्", "शब्दानुशासनमहाजलधिं विमथ्य ।", "नामामृतं समददाद्य इदं कृपालुः", "स श्रीलजीवचरणः शरणं ममास्तु ॥ १ ॥"],
    iast: ["svalpāyuṣāṁ kali-yuge 'tra nṛṇāṁ śam icchan", "śabdānuśāsana-mahā-jaladhiṁ vimathya", "nāmāmṛtaṁ samadadād ya idaṁ kṛpāluḥ", "sa śrīla-jīva-caraṇaḥ śaraṇaṁ mamāstu"],
    translation:
      "Desiring the welfare of the short-lived people in this age of Kali, the compassionate Śrīla Jīva Gosvāmī churned the great ocean of Sanskrit grammar and bestowed upon them this Hari-nāmāmṛta-vyākaraṇa. May he be my shelter.",
  },
  {
    deva: ["नीरसं हि शब्दशास्त्रं", "नामरसविधानतः ।", "योऽमृतयन्नदान्नृभ्यः", "श्रीजीवो विजयतामसौ ॥ २ ॥"],
    iast: ["nīrasaṁ hi śabda-śāstraṁ", "nāma-rasa-vidhānataḥ", "yo 'mṛtayan adān nṛbhyaḥ", "śrī-jīvo vijayatām asau"],
    translation:
      "Glory to Śrī Jīva. He converted dry grammar into nectar by adding the rasa of the holy names, and then distributed this nectar to everyone.",
  },
];

const QUALITIES = [
  {
    title: "Unparalleled clarity",
    body: "Every sūtra is composed so its meaning is immediate and unambiguous — no chain of commentaries required.",
  },
  {
    title: "The ocean, churned",
    body: "Jīva Gosvāmī churned the entire ocean of Sanskrit grammar and distilled only its essence into this one work.",
  },
  {
    title: "Grammar as nectar",
    body: "Every example is drawn from the names and pastimes of Kṛṣṇa, turning dry rules of language into rasa.",
  },
];

const IMPORTANT_SITES = [
  { name: "Vedabase", url: "https://vedabase.io", blurb: "Śrīla Prabhupāda's books, online" },
  { name: "Prabhupāda Vāṇī", url: "https://prabhupadavani.org", blurb: "Lectures, conversations & recordings" },
  { name: "Taptajīvanam", url: "https://taptajivanam.com", blurb: "The teachings of Śrī Śrīmad Gour Govinda Swami Maharaja" },
  { name: "Bhaktivedanta Research Center", url: "https://brcglobal.org", blurb: "Gauḍīya Vaiṣṇava manuscripts & research" },
  { name: "Bhaktivinoda Institute", url: "https://bhaktivinodainstitute.org", blurb: "The complete works of Bhaktivinoda Ṭhākura" },
];

const PATHS = [
  {
    href: "/chapters",
    icon: BookOpenText,
    deva: "सूत्राणि",
    title: "Read the sūtras",
    body: "Every prakaraṇa of the Madhyama edition, sūtra by sūtra, with notes on the ones that need them.",
    color: "var(--accent)",
  },
  {
    href: "/anvyaya",
    icon: ScrollText,
    deva: "श्रीमद्भागवतम् · गीता",
    title: "Read the scriptures",
    body: "Śrīmad-Bhāgavatam and Bhagavad-gītā, verse by verse, with anvaya and translation.",
    color: "var(--scripture)",
  },
  {
    href: "/practice",
    icon: Target,
    deva: "अभ्यासः",
    title: "Practice Sandhi",
    body: "Join and split words by the rules of Sarveśvara, Viṣṇujana and Viṣṇusarga sandhi, with the sūtra behind every answer.",
    color: "var(--practice)",
  },
];

export default function Home() {
  const prakaranas = chapters.filter((c) => c.slug !== "mangalacarana" && c.slug !== "afterword");

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="hero-night relative overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-5 pt-14 pb-16 sm:pt-20 sm:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
          <div>
            <p className="text-[var(--color-haridra)] font-semibold mb-6">Śrīla Jīva Gosvāmī&apos;s</p>
            <h1 className="font-devanagari text-white text-[clamp(2.7rem,7.5vw,5.4rem)] !leading-[1.15] mb-5" lang="sa-Deva">
              श्रीहरिनामामृत<span className="block">व्याकरणम्</span>
            </h1>
            <p className="font-display text-2xl sm:text-3xl text-white mb-2">Śrī Harināmāmṛta-vyākaraṇam</p>
            <p className="text-lg text-[var(--hero-muted)] max-w-md mb-9">
              The grammar of the holy names of Lord Hari, where every technical term is a name of Kṛṣṇa.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/chapters" className="btn bg-[var(--color-haridra)] text-[var(--color-syama-900)] hover:bg-[#f2c56d]">
                Read the sūtras
              </Link>
              <Link href="/practice" className="btn btn-on-dark">
                Practice Sandhi
              </Link>
            </div>
            <p className="text-sm text-[var(--hero-muted)] mt-10 max-w-sm">
              Tap any letter on the board. Each group of the alphabet carries one of Hari&apos;s names, defined in the
              first sūtras of the grammar.
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--hero-line)] bg-white/[0.02] p-4 sm:p-6 backdrop-blur-[2px]">
            <VarnaBoard />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- verse of the day */}
      <DailyPanel />

      {/* --------------------------------- Ṣaḍ-Gosvāmīs + Amṛta's prayers */}
      <section className="bg-[var(--bg-2)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-24 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-12 lg:gap-16 items-start">
          <figure className="lg:sticky lg:top-24">
            <div className="painting-frame">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/hero-cover.jpg"
                  alt="The six Gosvāmīs of Vṛndāvana"
                  width={1984}
                  height={1298}
                  className="block w-full h-auto rounded-[2px]"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <figcaption className="mt-5 text-sm text-[var(--fg-muted)] leading-relaxed text-center">
              Gopāla Bhaṭṭa Gosvāmī, Raghunātha Bhaṭṭa Gosvāmī, Sanātana Gosvāmī, Rūpa Gosvāmī,{" "}
              <span className="font-semibold text-[var(--accent)]">Jīva Gosvāmī</span>, and Raghunātha dāsa Gosvāmī
              <span className="block mt-1">Art by HG Puṣkara Prabhu</span>
            </figcaption>
          </figure>

          <div>
            <h2 className="font-display text-4xl sm:text-5xl mb-10">Amṛta&apos;s prayers to Śrīla Jīva Gosvāmī</h2>
            <div className="space-y-12">
              {PRAYERS.map((p, i) => (
                <div key={i}>
                  <p className="font-devanagari text-[1.45rem] sm:text-[1.65rem] leading-[1.75] mb-4" lang="sa-Deva">
                    {p.deva.map((l) => (
                      <span key={l} className="block">
                        {l}
                      </span>
                    ))}
                  </p>
                  <p className="italic text-[var(--fg-muted)] leading-relaxed mb-5" lang="sa-Latn">
                    {p.iast.map((l) => (
                      <span key={l} className="block">
                        {l}
                      </span>
                    ))}
                  </p>
                  <blockquote
                    className="text-lg leading-relaxed border-l-2 pl-5"
                    style={{ borderColor: i === 0 ? "var(--accent)" : "var(--highlight)" }}
                  >
                    {p.translation}
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- the treatise */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl mb-6 max-w-xl">
              The finest treatise of Sanskrit grammar ever composed
            </h2>
            <p className="text-[var(--fg-muted)] text-lg leading-relaxed max-w-xl">
              Śrīla Jīva Gosvāmī studied virtually every major Sanskrit grammar in existence — Pāṇini&apos;s
              Aṣṭādhyāyī with the Vārttikas, Mahā-bhāṣya, and Kāśikā; Śarvavarmā&apos;s Kātantra; Vopadeva&apos;s
              Mugdha-bodha; Kramadīśvara&apos;s Saṅkṣipta-sāra; Candra Gomī&apos;s Cāndra-vyākaraṇa; Padmanābha
              Datta&apos;s Supadma; Anubhūti Svarūpāchārya&apos;s Sārasvata; and Rāmacandra Āchārya&apos;s
              Prakriyā-kaumudī. Having weighed them all, he found each one either incomplete, riddled with errors, or
              so terse it was unusable without a chain of commentaries.
            </p>
          </div>
          <dl className="divide-y divide-[var(--border)] border-y border-[var(--border)] self-start">
            {QUALITIES.map((q) => (
              <div key={q.title} className="py-6">
                <dt className="font-display text-2xl mb-1">{q.title}</dt>
                <dd className="text-[var(--fg-muted)] leading-relaxed">{q.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* the seven prakaraṇas, in order */}
        <div className="mt-20">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
            <h3 className="font-display text-3xl">Seven prakaraṇas, 1,278 sūtras</h3>
            <Link href="/chapters" className="font-semibold text-[var(--accent)] hover:underline">
              Table of contents
            </Link>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)] border border-[var(--border)] rounded-2xl overflow-hidden">
            {prakaranas.map((c) => (
              <li key={c.slug} className="bg-[var(--surface)]">
                <Link href={`/chapters/${c.slug}`} className="group flex h-full flex-col p-5 hover:bg-[var(--accent-soft)] transition-colors">
                  <span className="font-display text-4xl text-[var(--accent)] leading-none mb-4 sutra-number">{c.number}</span>
                  <span className="font-devanagari text-lg leading-snug group-hover:text-[var(--accent)]">{c.title}</span>
                  <span className="text-sm text-[var(--fg-muted)]">{c.titleEnglish}</span>
                  <span className="mt-auto pt-4 text-xs text-[var(--fg-faint)] sutra-number">Sūtras {c.sutraRange}</span>
                </Link>
              </li>
            ))}
            <li className="bg-[var(--surface)] p-5 flex flex-col justify-center">
              <span className="text-sm text-[var(--fg-muted)] leading-relaxed">
                Opened by the{" "}
                <Link href="/chapters/mangalacarana" className="underline">Maṅgalācaraṇa</Link> and closed by the{" "}
                <Link href="/chapters/afterword" className="underline">Afterword</Link>.
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------- ways into the text */}
      <section className="bg-[var(--bg-2)] border-y border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20 grid md:grid-cols-3 gap-6">
          {PATHS.map(({ href, icon: Icon, deva, title, body, color }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-7 overflow-hidden hover:shadow-[var(--shadow-lift)] transition-shadow"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: color }} />
              <Icon size={22} strokeWidth={1.75} style={{ color }} className="mb-6" />
              <span className="font-devanagari text-2xl mb-1" lang="sa-Deva">
                {deva}
              </span>
              <span className="font-display text-2xl mb-3" style={{ color }}>
                {title}
              </span>
              <span className="text-[var(--fg-muted)] leading-relaxed">{body}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------- important websites */}
      <section className="max-w-6xl mx-auto px-5 py-14">
        <h2 className="font-display text-3xl mb-6">Important websites</h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-5">
          {IMPORTANT_SITES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="group flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(s.url)}`}
                  alt=""
                  width={20}
                  height={20}
                  loading="lazy"
                  className="mt-0.5 h-5 w-5 rounded-sm shrink-0"
                />
                <span>
                  <span className="block font-semibold group-hover:text-[var(--accent)]">{s.name}</span>
                  <span className="block text-sm text-[var(--fg-muted)] leading-snug">{s.blurb}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
