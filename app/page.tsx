import Link from "next/link";
import { ScrollText, Library, BookOpen, ArrowRight, Leaf, Gauge, Flame, Search, ArrowDownAZ, Music, Languages, Wrench, NotebookPen, Earth, LayoutGrid } from "lucide-react";
import VarnaBoard from "@/components/home/VarnaBoard";
import DailyPanel from "@/components/home/DailyPanel";
import { getChapterList } from "@/lib/data/hnv";
import { getBooks } from "@/lib/data/scriptures";
import { getSongIndex } from "@/lib/data/songs";
import ScriptDemo from "@/components/home/ScriptDemo";
import LiveStats from "@/components/home/LiveStats";
import { getSyllabus } from "@/lib/data/scriptures";
import { listDictionaries } from "@/lib/dict/engine";
import DictSearch from "@/components/home/DictSearch";

const IMPORTANT_SITES = [
  { name: "Vedabase", url: "https://vedabase.io", blurb: "Śrīla Prabhupāda's books, online" },
  { name: "Prabhupāda Vāṇī", url: "https://prabhupadavani.org", blurb: "Lectures, conversations & recordings" },
  { name: "Taptajīvanam", url: "https://taptajivanam.com", blurb: "The teachings of Śrī Śrīmad Gour Govinda Swami Maharaja" },
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
    href: "/scriptures",
    icon: ScrollText,
    label: "Scriptures",
    title: "The library of śāstra",
    body: "Verse by verse in any script, with synonyms, anvaya, translation and the ācāryas' commentaries.",
    cta: "Explore the Scriptures",
  },
  {
    href: "/practice",
    icon: Library,
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

export const revalidate = 86400; // admin saves refresh it immediately

export default async function Home() {
  const [chapters, books, songIndex, syllabus, dicts] = await Promise.all([
    getChapterList("madhyama"),
    getBooks().catch(() => []),
    getSongIndex().catch(() => []),
    getSyllabus().catch(() => null),
    listDictionaries().catch(() => []),
  ]);
  const sutraTotal = chapters.reduce((n, c) => n + (c.kind === "sutras" ? c.sutraCount : 0), 0);
  const verseTotal = books.reduce((n, b) => n + b.verses, 0);
  const headwords = dicts.reduce((n, d) => n + d.wordCount, 0);
  const scriptureCount = books.length;
  const readyCount = books.filter((b) => b.verses > 0).length;
  const songCount = songIndex.length;
  return (
    <>

     <section className="relative overflow-hidden">
        <div className="absolute inset-0" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-5 pt-15 pb-5 text-center">
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
              Explore Chapters
            </Link>
            <Link
              href="/about"
              className="px-6 py-3 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            >
              About This Treatise
            </Link>
          </div>
        </div>
      </section>

     <div className="flex items-center gap-2 w-1/2 max-w-md mx-auto my-10">
  <div className="w-2.5 h-1 rounded-full bg-[var(--color-saffron)] shrink-0"></div>
  <div className="flex-1 h-px bg-gradient-to-r from-[var(--color-saffron)]/60 via-[var(--color-saffron)]/30 to-[var(--color-saffron)]/60"></div>
  <div className="w-2.5 h-1 rounded-full bg-[var(--color-saffron)] shrink-0"></div>
</div>

    <section>
  {/* Framed image panel */}
  <div className="relative overflow-hidden py-4 sm:py-5">
    {/* soft background behind the framed image */}
    <div className="absolute inset-0" aria-hidden />

    <div className="relative max-w-3xl mx-auto px-5">
      {/* Outer gradient frame */}
      <div
        className="relative mx-auto rounded-[1.25rem] p-[6px] sm:p-2 shadow-2xl"
        style={{
         background: `
    linear-gradient(var(--gradient-overlay), var(--gradient-overlay)),
    linear-gradient(135deg, var(--color-blue-light) 0%, var(--color-saffron) 45%, var(--color-vermillion) 100%)
  `,
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

 <p className={`text-sm  text-[var(--fg-muted)] mt-4 mb-10 sm:mt-4 sm:mb-4 text-center mb-6 leading-relaxed`}>
 <br></br>
  Gopāla Bhaṭṭa Gosvāmī, Raghunātha Bhaṭṭa Gosvāmī, Sanātana Gosvāmī, Rūpa Gosvāmī, <span className="font-semibold text-[var(--color-saffron)]">Jīva Gosvāmī</span>, and Raghunātha dāsa Gosvāmī<br></br>
  <b className="font-semibold">~ Art by HG Puṣkara Prabhu</b>
</p>
    </div>
    
  <div className="flex items-center gap-2 sm:w-1/8 w-1/4 max-w-md mx-auto my-10">
  <div className="w-2.5 h-1 rounded-full bg-[var(--color-saffron)] shrink-0"></div>
  <div className="flex-1 h-px bg-gradient-to-r from-[var(--color-saffron)]/60 via-[var(--color-saffron)]/30 to-[var(--color-saffron)]/60"></div>
  <div className="w-2.5 h-1 rounded-full bg-[var(--color-saffron)] shrink-0"></div>
</div>

  </div>
</section>
     
 
    <section id="amrta" className="scroll-mt-20">
        <div className="border-b border-[var(--border)] bg-[var(--bg-2)]">
          <div className="max-w-3xl mx-auto px-5 py-16">
            <AmrtaPrayers />
          </div>
        </div>
      </section>

      <DailyPanel />

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

     

      <section className="relative overflow-hidden border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="max-w-6xl mx-auto px-5 py-20 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-4">Varṇa-krama</p>
            <h2 className="text-2xl sm:text-4xl font-semibold mb-5 leading-tight">An alphabet named for Hari</h2>
            <p className="text-[var(--fg-muted)] leading-relaxed mb-4">
              In Harināmāmṛta-vyākaraṇa every technical term is a name of Kṛṣṇa. The fourteen vowels are{" "}
              <em>sarveśvaras</em>, the consonants are <em>viṣṇujanas</em>, and the five columns of stops are Hari&apos;s
              lotus, sword, club, conchshell and flute.
            </p>
            <p className="text-[var(--fg-muted)] leading-relaxed mb-8">
              Tap any letter to see its name and the sūtra that defines it.
            </p>
            <Link
              href="/chapters/samjna-sandhi-prakarana"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--accent)] text-[var(--accent)] font-medium hover:bg-[var(--accent)] hover:text-[var(--color-ink)] transition-colors"
            >
              Read the Saṁjñā sūtras <ArrowRight size={16} />
            </Link>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-6 shadow-sm">
            <VarnaBoard />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3 text-center">The treatise</p>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-10 text-center">Seven prakaraṇas, sūtra by sūtra</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {chapters
            .filter((c) => c.kind === "sutras")
            .map((c) => (
              <li key={c.slug}>
                <Link href={`/chapters/${c.slug}`} className="anv-card p-5 h-full group">
                  <span className="anv-numeral absolute -right-1 -top-2 text-[4.5rem] sutra-number select-none">{c.number}</span>
                  <span className="block text-xs text-[var(--color-saffron)] mb-2">Chapter {c.number}</span>
                  <span className="block font-devanagari text-lg leading-snug pr-10 group-hover:text-[var(--accent)] transition-colors">{c.title}</span>
                  <span className="block text-sm text-[var(--fg-muted)] mb-4">{c.titleEn}</span>
                  <span className="block text-xs text-[var(--fg-muted)] sutra-number">Sūtras {c.rangeLabel}</span>
                </Link>
              </li>
            ))}
          <li>
            <Link href="/chapters" className="anv-card p-5 h-full group">
              <span className="block text-sm text-[var(--fg-muted)] mb-2">Also the Maṅgalācaraṇa and the Afterword</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)]">
                Full table of contents <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </li>
        </ol>
      </section>

      {/* ---------------------------------------------------- Live numbers */}
      <section className="max-w-6xl mx-auto px-5 pt-16 sm:pt-20 pb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3 text-center">Growing every day</p>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-8 text-center">One home for the study of Śrī Jīva&apos;s grammar</h2>
        <LiveStats
          items={[
            { n: sutraTotal, label: "Sūtras", sub: "Madhyama edition, online" },
            { n: books.length, label: "Scriptures", sub: "in the library" },
            { n: verseTotal, label: "Verses", sub: "to read, in any script" },
            { n: songIndex.length, label: "Songs", sub: "of the ācāryas" },
            { n: headwords, label: "Dictionary words", sub: `in ${dicts.length} dictionaries` },
          ]}
        />
      </section>

      {/* ---------------------------------------------------------- Scriptures */}
      <section className="relative overflow-hidden border-y border-[var(--border)]">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-5 py-16 sm:py-20 grid lg:grid-cols-[1fr_1.05fr] gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">Scriptures · शास्त्राणि</p>
            <h2 className="text-2xl sm:text-4xl font-semibold mb-4 leading-tight">The library of śāstra, verse by verse</h2>
            <p className="text-[var(--fg-muted)] leading-relaxed mb-6">
              {scriptureCount > 0 ? `${scriptureCount} scriptures listed, ${readyCount} ready to read — ` : ""}arranged as you like: by category, by author, A–Z, or in the order of study given by Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura.
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mb-8 text-sm">
              {[
                ["Any script", "Devanagari, IAST, Bengali or Odia — one click"],
                ["Four layers", "Synonyms, anvaya, translation — and the commentaries"],
                ["Every commentary", "Ṭīkās and purports in one tidy list"],
                ["Whole chapters", "All verses at once, with or without translation"],
                ["Dual reading", "Two books or two verses, side by side"],
                ["Your notebook", "Write notes while you read, on any page"],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-saffron)]" />
                  <span>
                    <span className="font-medium">{t}</span>
                    <span className="block text-[var(--fg-muted)]">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link href="/scriptures" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90 transition-opacity">
                Open the library <ArrowRight size={16} />
              </Link>
              <Link href="/scriptures/syllabus" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors">
                Śrīla Bhaktisiddhānta&apos;s order
              </Link>
            </div>
          </div>
          <ScriptDemo />
        </div>
      </section>

      {/* ------------------------------------- Śrīla Bhaktisiddhānta's order */}
      {syllabus && (
        <section className="relative overflow-hidden bg-[var(--color-ink)] text-[var(--color-parchment)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.18]" style={{ background: "radial-gradient(60% 80% at 15% 10%, var(--color-saffron), transparent 60%), radial-gradient(50% 70% at 90% 90%, var(--color-gold), transparent 60%)" }} aria-hidden />
          <div className="relative max-w-6xl mx-auto px-5 py-16 sm:py-20 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-gold-light)] mb-3">The order of study</p>
              <h2 className="text-2xl sm:text-4xl font-semibold mb-4 leading-tight">Śāstra, as Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura arranged it</h2>
              <p className="opacity-80 leading-relaxed mb-6">
                For the Sārvabhauma examination of the Para-vidyāpīṭha in Śrī Māyāpura, he set out the scriptures in ten subjects — each with its principal and secondary works. See the whole list, linked to the books in our library.
              </p>
              <Link href="/scriptures/syllabus" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--color-gold)] text-[var(--color-ink)] font-medium hover:opacity-90 transition-opacity">
                See the order of study <ArrowRight size={16} />
              </Link>
            </div>
            <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {syllabus.subjects.map((x) => (
                <li key={x.n}>
                  <Link href="/scriptures/syllabus" className="group flex h-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-4 text-center transition-colors hover:border-[var(--color-gold)] hover:bg-white/[0.08]">
                    <span className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-gold)] text-xs font-bold text-[var(--color-ink)]">{x.n}</span>
                    <span className="font-devanagari text-lg leading-tight">{x.name}</span>
                    <span className="mt-0.5 text-[11px] opacity-70">{x.nameEn.split(" — ")[0]}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- Songs */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
          <div className="order-2 lg:order-1 grid grid-cols-2 gap-3">
            {[
              { icon: Search, t: "Find any song", d: "By title, first line or author — in any script or spelling" },
              { icon: ArrowDownAZ, t: "A–Z rail", d: "Tap or drag through the letters, like your phone’s contacts" },
              { icon: BookOpen, t: "By book", d: "Śaraṇāgati, Gītāvalī, Prema-bhakti-candrikā … in their own order" },
              { icon: Music, t: "Sing from the page", d: "Lyrics only, or with translation and synonyms" },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-4">
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg)] text-[var(--accent)] ring-1 ring-[var(--border)]">
                  <Icon size={17} strokeWidth={1.8} />
                </span>
                <p className="font-medium text-sm">{t}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--fg-muted)]">{d}</p>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">Vaiṣṇava songs</p>
            <h2 className="text-2xl sm:text-4xl font-semibold mb-4 leading-tight">The songs of the ācāryas</h2>
            <p className="text-[var(--fg-muted)] leading-relaxed mb-6">
              Songs, aṣṭakams, stotras and the verses of Padyāvalī — organised by author, book and type, each with its translation, in the script you read best.
              {songCount > 0 ? ` ${songCount} songs so far.` : ""}
            </p>
            <Link href="/songs" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--accent)] text-[var(--accent)] font-medium hover:bg-[var(--accent)] hover:text-[var(--color-ink)] transition-colors">
              Browse the songs <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Dictionary */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20 grid lg:grid-cols-[1fr_1fr] gap-10 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3">Sanskrit dictionary</p>
            <h2 className="text-2xl sm:text-4xl font-semibold mb-4 leading-tight">Every great dictionary, one search</h2>
            <p className="text-[var(--fg-muted)] leading-relaxed mb-6">
              Monier-Williams, Apte, Amarakośa, Vācaspatyam, Śabdakalpadruma, declension and conjugation tables, and more — searched together or one by one.
            </p>
            <ul className="grid gap-3 text-sm mb-2">
              {[
                ["Type it any way", "कृष्ण, kṛṣṇa, krsna or krishna — all find the same word. No special codes to learn."],
                ["Search by meaning", "Type “lotus” or “God” and see which Sanskrit words mean it."],
                ["Choose your dictionaries", "Search all of them at once, or only the ones you trust."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-saffron)]" />
                  <span>
                    <span className="font-medium">{t}</span>
                    <span className="block text-[var(--fg-muted)]">{d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <DictSearch />
        </div>
      </section>

      {/* ------------------------------------------------- The path of study */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3 text-center">Where to begin</p>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-12 text-center">A path of study, step by step</h2>
          <ol className="path-steps">
            {[
              { n: 1, t: "Learn the alphabet", d: "Every letter has a name of Hari. Tap the varṇa board above.", href: "/chapters/samjna-sandhi-prakarana", cta: "Saṁjñā sūtras" },
              { n: 2, t: "Read the sūtras", d: "Chapter by chapter, with vṛtti, translation and commentaries.", href: "/chapters", cta: "Chapters" },
              { n: 3, t: "Practise", d: "Sandhi exercises — every answer shows its sūtra.", href: "/practice", cta: "Practice" },
              { n: 4, t: "Read śāstra", d: "Verse by verse, with the dictionary one click away.", href: "/scriptures", cta: "Scriptures" },
              { n: 5, t: "Sing", d: "The songs of the ācāryas, in the script you read best.", href: "/songs", cta: "Songs" },
            ].map((x) => (
              <li key={x.n}>
                <span className="path-dot">{x.n}</span>
                <p className="mt-4 font-semibold">{x.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--fg-muted)]">{x.d}</p>
                <Link href={x.href} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline">
                  {x.cta} <ArrowRight size={14} />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------- Everything else */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-3 text-center">On this website</p>
        <h2 className="text-2xl sm:text-3xl font-semibold mb-10 text-center">Everything for your study, in one place</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { href: "/chapters", icon: BookOpen, t: "Chapters & sūtras", d: "Madhyama, Bṛhat and Laghu — sūtra by sūtra, in any script, with each Madhyama sūtra linked to its Bṛhat sūtra." },
            { href: "/scriptures", icon: ScrollText, t: "Scriptures", d: "Verse, synonyms, anvaya, translation and every commentary — the heart of the site." },
            { href: "/songs", icon: Music, t: "Vaiṣṇava songs", d: "Search any song, organised by author, book and type." },
            { href: "/tools/dictionary/search", icon: Languages, t: "Dictionary", d: "All the major Sanskrit dictionaries, typed in any script." },
            { href: "/practice", icon: Library, t: "Practice", d: "Sandhi exercises by topic and difficulty, every answer tied to its sūtra." },
            { href: "/tools", icon: Wrench, t: "Tools", d: "Grammar tools that show the sūtra behind each change, and text utilities." },
            { href: "/notes", icon: NotebookPen, t: "Notebook", d: "Your own notes from any page — kept on your device, with backup." },
            { href: "/hnv-wiki", icon: Earth, t: "HNV-Wiki", d: "The sūtras explained simply, with meanings and examples." },
            { href: "/more", icon: LayoutGrid, t: "Courses & resources", d: "Online courses on Harināmāmṛta-vyākaraṇam, playlists, resources and news." },
          ].map(({ href, icon: Icon, t, d }) => (
            <Link key={href} href={href} className="group flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-lift)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-2)] text-[var(--accent)] ring-1 ring-[var(--border)] transition-colors group-hover:bg-[var(--accent)] group-hover:text-[var(--color-ink)]">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-medium">
                  {t} <ArrowRight size={14} className="opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-[var(--fg-muted)]">{d}</span>
              </span>
            </Link>
          ))}
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
<section className="max-w-6xl mx-auto px-5 py-15 border-b">
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
      <section className="border-[var(--border)] ">
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

      
    </>
  );
}

