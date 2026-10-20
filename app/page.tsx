import Link from "next/link";
import { ScrollText, Dumbbell, BookOpen, ArrowRight, Globe, Leaf, Gauge, Flame } from "lucide-react";

const IMPORTANT_SITES = [
  { name: "Vedabase", url: "https://vedabase.io", blurb: "Śrīla Prabhupāda's books, online" },
  { name: "Prabhupāda Vāṇī", url: "https://prabhupadavani.org", blurb: "Lectures, conversations & recordings" },
  { name: "Taptajīvanam", url: "https://taptajivanam.com", blurb: "The teachings of Śrīla Gour Govinda Swami" },
  { name: "Bhaktivedanta Research Center", url: "https://brcglobal.org", blurb: "Gauḍīya Vaiṣṇava manuscripts & research" },
  { name: "Bhaktivinoda Institute", url: "https://bhaktivinodainstitute.org", blurb: "The complete works of Bhaktivinoda Ṭhākura" },
];

const EXPLORE_CARDS = [
  {
    href: "/chapters",
    icon: BookOpen,
    label: "Chapters",
    title: "Start with the sūtras",
    body: "Every chapter, section, and sūtra of the Madhyama edition, organized for online study.",
    cta: "View the table of contents",
  },
  {
    href: "/anvyaya",
    icon: ScrollText,
    label: "Scripture Anvyayas",
    title: "Śrīmad-Bhāgavatam & Bhagavad-gītā",
    body: "Every verse with its anvyaya and translation, with Devanagari and a link to Śrīla Prabhupāda's purport.",
    cta: "Explore the Anvyayas",
  },
  {
    href: "/practice",
    icon: Dumbbell,
    label: "Practice",
    title: "Test yourself on Sandhi",
    body: "Pick a topic and a difficulty, then see how well the rules have stuck — instant feedback, a score at the end.",
    cta: "Start practicing",
  },
];

function SiteFavicon({ url, size }: { url: string; size: number }) {
  return (
    <img
      src={`https://www.google.com/s2/favicons?sz=${size * 2}&domain_url=${encodeURIComponent(url)}`}
      alt=""
      width={size}
      height={size}
      className="block"
    />
  );
}

function AmrtaPrayers({ align = "center" }: { align?: "center" | "left" }) {
  const alignCls = align === "left" ? "text-left" : "text-center";
  const mxCls = align === "left" ? "" : "mx-auto";

  return (
    <div className={alignCls}>
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-10">
        Amṛta&apos;s Prayers to Jīva Gosvāmī
      </p>

      <div className="mb-12">
        <p className={`font-devanagari text-xl sm:text-2xl leading-relaxed ${mxCls} mb-4`}>
          स्वल्पायुषां कलियुगेऽत्र नृणां शमिच्छन्<br />
          शब्दानुशासनमहाजलधिं विमथ्य ।<br />
          नामामृतं समददाद्य इदं कृपालुः<br />
          स श्रीलजीवचरणः शरणं ममास्तु ॥ १ ॥
        </p>
        <p className={`text-sm italic text-[var(--fg-muted)] ${mxCls} mb-6 leading-relaxed`}>
          svalpāyuṣāṁ kali-yuge &apos;tra nṛṇāṁ śam icchan<br />
          śabdānuśāsana-mahā-jaladhiṁ vimathya<br />
          nāmāmṛtaṁ samadadād ya idaṁ kṛpāluḥ<br />
          sa śrīla-jīva-caraṇaḥ śaraṇaṁ mamāstu
        </p>
        <blockquote className={`text-base sm:text-lg leading-relaxed max-w-2xl ${mxCls} text-[var(--fg)] border-l-2 border-[var(--color-vermillion)] pl-5`}>
          Desiring the welfare of the short-lived people in this age of Kali, the compassionate
          Śrīla Jīva Gosvāmī churned the great ocean of Sanskrit grammar and bestowed upon them
          this <em>Hari-nāmāmṛta-vyākaraṇa</em>. May he be my shelter.
        </blockquote>
      </div>

      <div className={`h-px bg-[var(--border)] max-w-xs ${mxCls} mb-12`} />

      <div>
        <p className={`font-devanagari text-xl sm:text-2xl leading-relaxed ${mxCls} mb-4`}>
          नीरसं हि शब्दशास्त्रं<br />
          नामरसविधानतः ।<br />
          योऽमृतयन्नदान्नृभ्यः<br />
          श्रीजीवो विजयतामसौ ॥ २ ॥
        </p>
        <p className={`text-sm italic text-[var(--fg-muted)] ${mxCls} mb-6 leading-relaxed`}>
          nīrasaṁ hi śabda-śāstraṁ<br />
          nāma-rasa-vidhānataḥ<br />
          yo &apos;mṛtayan adān nṛbhyaḥ<br />
          śrī-jīvo vijayatām asau
        </p>
        <blockquote className={`text-base sm:text-lg leading-relaxed max-w-2xl ${mxCls} text-[var(--fg)] border-l-2 border-[var(--color-gold)] pl-5`}>
          Glory to Śrī Jīva. He converted dry grammar into nectar by adding the <em>rasa</em> of
          the holy names, and then distributed this nectar to everyone.
        </blockquote>
      </div>

    </div>
  );
}

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-5 pt-24 pb-20 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-saffron)] mb-5">
            Śrīla Jīva Gosvāmī&apos;s
          </p>
          <h1 className="font-devanagari text-4xl sm:text-6xl leading-tight mb-3">
            श्री हरिनामामृत व्याकरणम्
          </h1>
          <p className="text-xl sm:text-2xl mb-2">Śrī Harināmāmṛta Vyākaraṇam</p>
          <p className="text-base italic text-[var(--fg-muted)] mb-10">
            (The Grammar of the Holy Names of Lord Hari)
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/chapters"
              className="px-6 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90 transition-opacity"
            >
              Explore the Sūtras
            </Link>
            <Link
              href="/about"
              className="px-6 py-3 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            >
              About this project
            </Link>
          </div>
        </div>
      </section>

      <section>
        {/* SAD-GOSVĀMĪS — FRAMED IMAGE + AMṚTA'S PRAYERS */}
<section>
  {/* Framed image panel */}
  <div className="relative overflow-hidden py-14 sm:py-20">
    {/* soft background behind the framed image */}
    <div className="anv-hero-bg absolute inset-0" aria-hidden />

    <div className="relative max-w-3xl mx-auto px-5">
      {/* Outer gradient frame */}
      <div
        className="relative mx-auto rounded-[1.25rem] p-[6px] sm:p-2 shadow-2xl"
        style={{
          background:
            "linear-gradient(135deg, var(--color-gold-light) 0%, var(--color-saffron) 45%, var(--color-vermillion) 100%)",
        }}
      >
        {/* Inner hairline + clipped image */}
        <div className="rounded-[1rem] overflow-hidden border border-black/25 bg-[var(--bg-2)]">
          {/*
            Using an <img> instead of background-image so the
            whole photo is shown (no cropping). If the file is
            missing, the browser falls back to the alt text — if
            you'd rather keep the gradient fallback, see the
            <picture> variant below.
          */}
          <img
            src="/hero-cover.jpg"
            alt="The Ṣaḍ-Gosvāmīs of Vṛndāvana"
            className="block w-full h-auto"
            loading="lazy"
          />
        </div>
      </div>

      <p className="mt-6 text-center text-xs tracking-[0.3em] uppercase text-[var(--color-gold-light)]">
        The Ṣaḍ-Gosvāmīs of Vṛndāvana
      </p>
    </div>
  </div>

  {/* Amṛta's Prayers */}
  <div className="border-b border-[var(--border)] bg-[var(--bg-2)]">
    <div className="max-w-3xl mx-auto px-5 py-16">
      <AmrtaPrayers />
    </div>
  </div>
</section>
        <div className="border-b border-[var(--border)] bg-[var(--bg-2)]">
          <div className="max-w-3xl mx-auto px-5 py-16">
            <AmrtaPrayers />
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-center">
          The finest treatise of Sanskrit grammar ever composed
        </h2>
        <p className="text-[var(--fg-muted)] max-w-2xl mx-auto text-center mb-12 leading-relaxed">
          Śrīla Jīva Gosvāmī studied virtually every major Sanskrit grammar in existence —
          Pāṇini&apos;s Aṣṭādhyāyī with the Vārttikas, Mahā-bhāṣya, and Kāśikā; Śarvavarmā&apos;s
          Kātantra; Vopadeva&apos;s Mugdha-bodha; Kramadīśvara&apos;s Saṅkṣipta-sāra; Candra
          Gomī&apos;s Cāndra-vyākaraṇa; Padmanābha Datta&apos;s Supadma; Anubhūti
          Svarūpāchārya&apos;s Sārasvata; and Rāmacandra Āchārya&apos;s Prakriyā-kaumudī. Having weighed
          them all, he found each one either incomplete, riddled with errors, or so terse it was
          unusable without a chain of commentaries.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
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
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-[var(--border)] p-6 hover:border-[var(--color-vermillion)] transition-colors"
            >
              <h3 className="font-medium mb-2 text-[var(--color-vermillion)]">{f.title}</h3>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="max-w-5xl mx-auto px-5 py-12 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { n: "1278", label: "sūtras (Madhyama)" },
            { n: "9", label: "chapters" },
            { n: "2", label: "scriptures in Anvyaya" },
            { n: "3", label: "sandhi types to practice" },
          ].map((s) => (
            <div key={s.label}>
              <p className="sutra-number text-3xl sm:text-4xl text-[var(--accent)] mb-1">{s.n}</p>
              <p className="text-xs uppercase tracking-wide text-[var(--fg-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-5 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-4">
            Scripture Anvyayas
          </p>
          <h2 className="font-devanagari text-3xl sm:text-5xl mb-4">अन्वयाः</h2>
          <div className="anv-ornament mb-6" aria-hidden>
            ◆
          </div>
          <p className="text-[var(--fg-muted)] max-w-2xl mx-auto mb-8 leading-relaxed">
            Śrīmad-Bhāgavatam &amp; Bhagavad-gītā, every verse with its anvyaya and translation, with
            Devanagari and a link to Śrīla Prabhupāda&apos;s purport.
          </p>
          <Link
            href="/anvyaya"
            className="inline-block px-8 py-3 rounded-full border border-[var(--accent)] text-[var(--accent)] font-medium hover:bg-[var(--accent)] hover:text-[var(--color-ink)] transition-colors"
          >
            Explore the Anvyayas
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--bg-2)]">
        <div className="max-w-4xl mx-auto px-5 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-4">Practice</p>
          <h2 className="font-devanagari text-3xl sm:text-5xl mb-4">अभ्यासः</h2>
          <p className="text-[var(--fg-muted)] max-w-xl mx-auto mb-8 leading-relaxed">
            Test yourself on Vowel, Consonant, and Visarga Sandhi — instant feedback, your score at
            the end.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-sm">
              <Leaf size={16} className="text-[#4caf7d]" /> Easy
            </span>
            <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-sm">
              <Gauge size={16} className="text-[var(--color-saffron)]" /> Medium
            </span>
            <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border)] text-sm">
              <Flame size={16} className="text-[var(--color-vermillion)]" /> Hard
            </span>
          </div>
          <Link
            href="/practice"
            className="inline-block px-8 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90 transition-opacity"
          >
            Start practicing
          </Link>
        </div>
      </section>

      <section className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-5 py-14">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-8 text-center">
            Some Important Websites
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {IMPORTANT_SITES.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4 hover:border-[var(--accent)] transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                  <SiteFavicon url={s.url} size={16} />
                </span>
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-xs text-[var(--fg-muted)] leading-snug">{s.blurb}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3 text-center">
          Explore
        </p>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-12 text-center">Three ways into the text</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {EXPLORE_CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.href}
                href={c.href}
                className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-7 flex flex-col hover:border-[var(--accent)] transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mb-5 text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--color-ink)] transition-colors">
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-saffron)] mb-2">{c.label}</p>
                <h3 className="text-lg font-medium mb-2">{c.title}</h3>
                <p className="text-sm text-[var(--fg-muted)] leading-relaxed mb-6 flex-1">{c.body}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
                  {c.cta} <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

