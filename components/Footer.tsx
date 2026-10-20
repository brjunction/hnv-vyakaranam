import { Globe } from "lucide-react";

const IMPORTANT_SITES = [
  { name: "Vedabase", url: "https://vedabase.io", blurb: "Śrīla Prabhupāda's books, online" },
  { name: "Prabhupāda Vāṇī", url: "https://prabhupadavani.org", blurb: "Lectures, conversations & recordings" },
  { name: "Taptajīvanam", url: "https://taptajivanam.com", blurb: "The teachings of Śrīla Gour Govinda Swami" },
  { name: "Bhaktivedanta Research Center", url: "https://brcglobal.org", blurb: "Gauḍīya Vaiṣṇava manuscripts & research" },
  { name: "Bhaktivinoda Institute", url: "https://bhaktivinodainstitute.org", blurb: "The complete works of Bhaktivinoda Ṭhākura" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-24">

      <div className="max-w-6xl mx-auto px-5 py-10 text-sm text-[var(--fg-muted)]">
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
          <p>Hari-nāmāmṛta Vyākaraṇa — the grammar of Śrīla Jīva Gosvāmī.</p>
          <p>An open study edition. Sanskrit in service of nāma.</p>
        </div>
        <p className="text-xs">
          Source materials for this website have been kindly provided by HG Matsya Avatāra Prabhu.
        </p>
      </div>
    </footer>
  );
}
