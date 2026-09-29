import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-14 text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-saffron)] mb-5">
          Śrīla Jīva Gosvāmī's
        </p>
        <h1 className="font-devanagari text-4xl sm:text-6xl leading-tight text-[var(--fg)] mb-3">
          श्री हरिनामामृत व्याकरणम्
        </h1>
        <p className="text-xl sm:text-2xl text-[var(--fg)] mb-2">
          Śrī Harināmāmṛta Vyākaraṇam
        </p>
        <p className="text-base italic text-[var(--fg-muted)] mb-10">
          (The Grammar of the Holy Names of Lord Hari)
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/chapters" className="px-6 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90 transition-opacity">
            Begin the study
          </Link>
          <Link href="/about" className="px-6 py-3 rounded-full border border-[var(--border)] hover:border-[var(--accent)] transition-colors">
            About this edition
          </Link>
        </div>
      </section>

      {/* Twin verses */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="max-w-4xl mx-auto px-5 py-16">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-10 text-center">
            The Maṅgalācaraṇa — Two Verses on Sarasvatī
          </p>

          <div className="mb-14">
            <p className="font-devanagari text-xl sm:text-2xl leading-relaxed text-center mb-4">
              हानीयं पाणिनीयं रसवदरसवत्काकलापः कलापः<br />
              सारप्रत्यागि सारस्वतमपहतगीर्विस्तरो विस्तरोऽपि ।<br />
              चान्द्रं दुःखेन सान्द्रं सकलमविकलं शास्त्रमन्यच्च धन्यं<br />
              गोविन्दं विन्दमानां भगवति भवतीं वाणि नो चेद् ब्रवाणि ॥
            </p>
            <p className="text-sm italic text-[var(--fg-muted)] text-center mb-6 leading-relaxed">
              hānīyaṁ pāṇinīyaṁ rasavad arasavat kāka-lāpaḥ kalāpaḥ<br />
              sāra-pratyāgi sārasvatam apahata-gīr vistaro vistaro 'pi<br />
              cāndraṁ duḥkhena sāndraṁ sakalam avikalaṁ śāstram anyan na dhanyaṁ<br />
              govindaṁ vindamānāṁ bhagavati bhavatīṁ vāṇi no ced bravāṇi
            </p>
            <blockquote className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto text-center text-[var(--fg)] border-l-2 border-[var(--color-vermillion)] pl-5">
              O Sarasvatī, divine goddess of speech, if I don't use you to obtain Govinda, then
              <em> Aṣṭādhyāyī</em> is rubbish, <em>Rasavat</em> is tasteless, <em>Kalāpa</em> is
              like the cawing of crows, <em>Sārasvata</em> (although spoken by you) is useless,
              <em> Vistara</em> is verbiage, <em>Cāndra</em> is full of misery, and all other
              grammars are inauspicious.
            </blockquote>
          </div>

          <div className="h-px bg-[var(--border)] max-w-xs mx-auto mb-14" />

          <div>
            <p className="font-devanagari text-xl sm:text-2xl leading-relaxed text-center mb-4">
              पाणीयं पाणिनीयं रसमृदु रसवन्मुत्कलापः कलापः<br />
              सारश्रीसारि सारस्वतमधिमधुगीर्विस्तरो विस्तरोऽपि ।<br />
              चान्द्रं सौख्येन सान्द्रं सकलमविकलं शास्त्रमन्यत्प्रशस्तं<br />
              गोविन्दं विन्दतीं त्वां यदि भगवति गीर्वाणि वाणि ब्रवाणि ॥
            </p>
            <p className="text-sm italic text-[var(--fg-muted)] text-center mb-6 leading-relaxed">
              pāṇīyaṁ pāṇinīyaṁ rasa-mṛdu rasavan mut-kalāpaḥ kalāpaḥ<br />
              sāra-śrīsāri sārasvatam adhi-madhu-gīr-vistaro vistaro 'pi<br />
              cāndraṁ saukhyena sāndraṁ sakalam avikalaṁ śāstram anyat praśastaṁ<br />
              govindaṁ vindatīṁ tvāṁ yadi bhagavati gīr-vāṇi vāṇi bravāṇi
            </p>
            <blockquote className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto text-center text-[var(--fg)] border-l-2 border-[var(--color-gold)] pl-5">
              However, O goddess, if I use you to obtain Govinda, then <em>Aṣṭādhyāyī</em> is
              worth drinking, <em>Rasavat</em> is tasteful, <em>Kalāpa</em> is a bundle of joy,
              <em> Sārasvata</em> leads to steady opulence, <em>Vistara</em> is an elaboration on
              sweet speech, <em>Cāndra</em> is full of happiness, and all other grammars are
              auspicious.
            </blockquote>
          </div>

          <p className="mt-10 text-sm text-[var(--fg-muted)] text-center">
            — Śrīla Jīva Gosvāmī, Afterword to <em>Hari-nāmāmṛta-vyākaraṇa</em>
          </p>
        </div>
      </section>

      {/* Why the best treatise */}
      <section className="max-w-5xl mx-auto px-5 py-20">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4 text-center">
          The finest treatise of Sanskrit grammar ever composed
        </h2>
        <p className="text-[var(--fg-muted)] max-w-2xl mx-auto text-center mb-12 leading-relaxed">
          Śrīla Jīva Gosvāmī studied virtually every major Sanskrit grammar in existence —
          Pāṇini's Aṣṭādhyāyī with the Vārttikas, Mahā-bhāṣya, and Kāśikā; Śarvavarmā's
          Kātantra; Vopadeva's Mugdha-bodha; Kramadīśvara's Saṅkṣipta-sāra; Candra Gomī's
          Cāndra-vyākaraṇa; Padmanābha Datta's Supadma; Anubhūti Svarūpāchārya's Sārasvata;
          and Rāmacandra Āchārya's Prakriyā-kaumudī. Having weighed them all, he found each one
          either incomplete, riddled with errors, or so terse it was unusable without a chain of
          commentaries. Even Pāṇini's own Aṣṭādhyāyī demands the Vārttikas, the Mahā-bhāṣya, and
          the Kāśikā together just to be understood — and the Mahā-bhāṣya covers barely a third
          of Pāṇini's sūtras.
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { title: "Unparalleled clarity", body: "Every sūtra is composed so its meaning is immediate and unambiguous — no chain of commentaries required." },
            { title: "The ocean, churned", body: "Jīva Gosvāmī churned the entire ocean of Sanskrit grammar and distilled only its essence into this one work." },
            { title: "Grammar as nectar", body: "Every example is drawn from the names and pastimes of Kṛṣṇa, turning dry rules of language into rasa." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-[var(--border)] p-6 hover:border-[var(--color-vermillion)] transition-colors">
              <h3 className="font-medium mb-2 text-[var(--color-vermillion)]">{f.title}</h3>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Prayer verse */}
      <section className="bg-[var(--bg-2)] border-y border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-5 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-6">
            Amṛta's Prayer to Jīva Gosvāmī
          </p>
          <p className="leading-relaxed text-[var(--fg)] max-w-xl mx-auto">
            Desiring the welfare of the short-lived people of Kali-yuga, the compassionate Śrīla
            Jīva Gosvāmī churned the great ocean of Sanskrit grammar and bestowed upon them this
            Hari-nāmāmṛta-vyākaraṇa. He converted dry grammar into nectar by adding the rasa of
            the holy names, and distributed it to everyone. May his feet be my shelter.
          </p>
          <Link href="/about" className="inline-block mt-8 text-sm text-[var(--color-vermillion)] hover:underline">
            Know more about Hari-nāmāmṛta Vyākaraṇa →
          </Link>
        </div>
      </section>

      {/* Scripture Anvyayas */}
      <section className="relative overflow-hidden border-y border-[var(--border)]">
        <div className="anv-hero-bg absolute inset-0" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-5 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-saffron)] mb-4">
            Scripture Anvyayas
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
            Śrīmad-Bhāgavatam &amp; Bhagavad-gītā, in prose order
          </h2>
          <p className="text-[var(--fg-muted)] max-w-2xl mx-auto mb-8 leading-relaxed">
            Every verse with its anvyaya and translation, with Devanagari and a link to Śrīla
            Prabhupāda&apos;s purport on Vedabase.
          </p>
          <Link href="/anvyaya" className="inline-block px-8 py-3 rounded-full border border-[var(--accent)] text-[var(--accent)] font-medium hover:bg-[var(--accent)] hover:text-[var(--color-ink)] transition-colors">
            Explore the Anvyayas
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-5 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Start with the sūtras</h2>
        <p className="text-[var(--fg-muted)] mb-8">
          Every chapter, section, and sūtra — organized for online study reference.
        </p>
        <Link href="/chapters" className="inline-block px-8 py-3 rounded-full bg-[var(--accent)] text-[var(--color-ink)] font-medium hover:opacity-90 transition-opacity">
          View the full table of contents
        </Link>
      </section>
    </>
  );
}