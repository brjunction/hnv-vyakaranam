import { SITE_URL } from "@/lib/site";

// Structured data for search engines (schema.org): the site's name and its
// other spellings, the logo, a search box, and the main sections — what
// Google uses to name the site and to show its sections under the result.

const SECTIONS = [
  ["Chapters — sūtra by sūtra", "/chapters", "Every sūtra of Harināmāmṛta-vyākaraṇam with vṛtti, translation and commentaries."],
  ["Scriptures", "/scriptures", "The library of śāstra, verse by verse, with synonyms, anvaya, translation and commentaries."],
  ["Vaiṣṇava Bhajans", "/songs", "Songs of the ācāryas, aṣṭakams and stotras — search any bhajan."],
  ["Sanskrit Dictionary", "/tools/dictionary/search", "Monier-Williams, Apte, Vācaspatyam, Śabdakalpadruma and more — typed in any script."],
  ["Practice", "/practice", "Sandhi exercises, every answer tied to its sūtra."],
  ["HNV-Wiki", "/hnv-wiki", "The sūtras explained simply."],
  ["Tools", "/tools", "Grammar tools and text utilities."],
  ["Courses & resources", "/more", "Online courses, YouTube playlists and resources."],
] as const;

export default function SeoJsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "Harināmāmṛta-Vyākaraṇam",
      alternateName: ["Harinamamrta Vyakaranam", "Harinamamrita Vyakaranam", "Hari-namamrta-vyakarana", "HNV", "हरिनामामृतव्याकरणम्"],
      description: "Study Śrīla Jīva Gosvāmī's Harināmāmṛta-vyākaraṇam — every sūtra, a library of scriptures verse by verse, Vaiṣṇava bhajans and a Sanskrit dictionary.",
      inLanguage: ["en", "sa"],
      publisher: { "@id": `${SITE_URL}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/scriptures/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Harināmāmṛta-Vyākaraṇam",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/hnvlogo.png`,
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Main sections",
      itemListElement: SECTIONS.map(([name, path, description], i) => ({
        "@type": "SiteNavigationElement",
        position: i + 1,
        name,
        description,
        url: `${SITE_URL}${path}`,
      })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
