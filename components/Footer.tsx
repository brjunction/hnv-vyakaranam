import { Globe } from "lucide-react";

const IMPORTANT_SITES = [
  { name: "Vedabase", url: "https://vedabase.io", blurb: "Śrīla Prabhupāda's books, online" },
  { name: "Prabhupāda Vāṇī", url: "https://prabhupadavani.org", blurb: "Lectures, conversations & recordings" },
  { name: "Taptajīvanam", url: "https://taptajivanam.com", blurb: "The teachings of Śrī Śrīmad Gour Govinda Swami Maharaja" },
  { name: "Bhaktivedanta Research Center", url: "https://brcglobal.org", blurb: "Gauḍīya Vaiṣṇava manuscripts & research" },
  { name: "Bhaktivinoda Institute", url: "https://bhaktivinodainstitute.org", blurb: "The complete works of Bhaktivinoda Ṭhākura" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-7">

      <div className="max-w-6xl mx-auto px-5 py-10 text-sm text-[var(--fg-muted)]">
        <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
          <p>Harināmāmṛta Vyākaraṇam — The Masterpiece of Sanskrit Grammar</p>
          <p>@ ISKCON, 2026</p>
        </div>
        <div className="text-sm">
          <strong> <u> Credits</u></strong> 
          <div><strong>Source Materials:</strong> HG Matsya Avatāra Prabhu, HG Gaurapada Prabhu, Bhaktivedanta Book Trust (BBT),  Rasvihari Lals and Sons Publications, Gaudiya Grantha Mandira.</div>
          
        </div>
      </div>
    </footer>
  );
}
