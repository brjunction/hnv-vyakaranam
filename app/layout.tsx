import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SiteChrome from "@/components/SiteChrome";
import { SITE_URL } from "@/lib/site";
import SeoJsonLd from "@/components/SeoJsonLd";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
   default: "Harinamamrta Vyakaranam: The Masterpiece on Sanskrit Grammar",
    template: "%s | Harināmāmṛtam Vyākaraṇam",
  },
  description:
    "Study Śrīla Jīva Gosvāmī's Harināmāmṛta-vyākaraṇam online: every sūtra with vṛtti and commentaries in Madhyama, Bṛhat and Laghu editions, a library of scriptures verse by verse in any script, Vaiṣṇava bhajans, a Sanskrit dictionary of 40 dictionaries, practice and tools.",
  applicationName: "Harināmāmṛta-Vyākaraṇam",
  keywords: [
    "Harinamamrta Vyakaranam",
  "Harinamamrita Vyakaranam",
  "Harinamamrt Vyakaran",
  "Harinamrita Vyakaranam",
  "Harinam Amrit Vyakaran",
  "Hari-namamrta-vyakarana",
  "HNV grammar",
  "HNV Vyakaranam",
  "HNV website",
  "harinamamrta-vyakaranam.com",

  // Jiva Gosvami & Gaudiya framing
  "Jiva Goswami grammar",
  "Jiva Goswami Sanskrit grammar",
  "Jiva Gosvami Harinamamrta",
  "Srila Jiva Gosvami grammar",
  "Gaudiya Vaishnava grammar",
  "Gaudiya Vaishnava Sanskrit",
  "Vaishnava Sanskrit grammar",
  "Sanskrit grammar for Vaishnavas",
  "Sanskrit grammar for devotees",
  "grammar where terms are names of Krishna",
  "grammar of Hari's names",
  "Sanskrit grammar as bhakti",
  "Sanskrit grammar as sadhana",
  "learn Sanskrit and bhakti together",
  "learn Sanskrit through names of Krishna",

  // Editions
  "Laghu Harinamamrta Vyakarana",
  "Madhyama Harinamamrta Vyakarana",
  "Brhad Harinamamrta Vyakarana",
  "Laghu HNV",
  "Madhyama HNV",
  "Brhad HNV",

  // HNV chapters (Madhyama)
  "Mangalacarana HNV",
  "Samjna Sandhi Prakarana",
  "Nama Prakarana",
  "Akhyata Prakarana",
  "Karaka Prakarana",
  "Krdanta Prakarana",
  "Samasa Prakarana",
  "Taddhita Prakarana",
  "HNV Afterword",

  // Grammatical analysis & features
  "Harinamamrta Vyakaranam sutras",
  "Harinamamrta Vyakaranam vritti",
  "Harinamamrta Vyakaranam translation",
  "Harinamamrta Vyakaranam Anvaya",
  "Anvaya grammatical analysis",
  "Sutra Notes HNV",
  "HNV sutra notes",
  "word by word Sanskrit analysis",
  "Sanskrit grammatical analysis online",
  "Sanskrit Anvaya analysis",
  "Harinamamrta Dhatupatha",
  "HNV dhatu patha",

  // Platform features
  "multi-script Sanskrit reader",
  "Devanagari IAST Bengali Odia reader",
  "Sanskrit reader with audio",
  "fast static Sanskrit platform",
  "pre-built Sanskrit study platform",
  "daily Sanskrit verse",
  "Verse of the Day Sanskrit",
  "Daily Subhashita Sanskrit",

  // Scriptures (growing library — generic + current)
  "Gaudiya Vaishnava scriptures Sanskrit",
  "Sanskrit scriptures with Anvaya",
  "Sanskrit scriptures word by word",
  "read Vaishnava scriptures online",
  "Bhagavad-gita Sanskrit Anvaya",
  "Bhagavad-gita word by word",
  "Srimad-Bhagavatam Sanskrit Anvaya",
  "Srimad-Bhagavatam word by word",
  "Bhagavad-gita verse by verse",
  "Srimad-Bhagavatam verse by verse",

  // Long-tail & questions
  "what is Harinamamrta Vyakaranam",
  "who was Jiva Goswami",
  "Harinamamrta Vyakaranam vs Panini",
  "Jiva Goswami grammar vs Ashtadhyayi",
  "Harinamamrta Vyakaranam Amrta commentary",
  "how to learn Vaishnava Sanskrit",
  "how to read Sanskrit scriptures",
  "learn Sanskrit for Bhakti",
  "Sanskrit grammar for ISKCON devotees",
  "Harinamamrta Vyakaranam PDF",
  "Harinamamrta Vyakaranam English translation",
    "Harinamamrta Vyakaranam",
    "Harinamamrita Vyakaranam Website",
    "The website of Harinamamrita Vyakaranam",
    "HNV website",
    "Jiva Gosvami grammar",
    "Sanskrit grammar",
    "Vaishnava vyakarana",
    "HNV grammar",
    "Panini grammar alternative",
  ],
  openGraph: {
    title: "Harināmāmṛta-Vyākaraṇam — Śrīla Jīva Gosvāmī's Sanskrit grammar",
    description:
      "Every sūtra of Harināmāmṛta-vyākaraṇam, a library of scriptures verse by verse, Vaiṣṇava bhajans and a Sanskrit dictionary — in Devanagari, IAST, Bengali or Odia.",
    type: "website",
    siteName: "Harināmāmṛta-Vyākaraṇam",
    images: [{ url: "/hero-cover.jpg", alt: "The Ṣaḍ-Gosvāmīs of Vṛndāvana" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1e19" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/hnvlogo.png" type="image/png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <meta name="google-site-verification" content="A0wYp6OHY16TtZb5ua8xmcSaN4D1YiLzLHOfULCdFZw" />
      </head>
      <body className="antialiased">
      
        <SeoJsonLd />
        <SiteChrome header={<Header />} footer={<Footer />}>
          {children}
        </SiteChrome>
        <Analytics/>
        <SpeedInsights/>
      </body>
    </html>
  );
}
