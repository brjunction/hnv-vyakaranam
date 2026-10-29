import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import PageHead from "@/components/PageHead";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the team behind the Hari-nāmāmṛta-vyākaraṇa study website.",
  alternates: { canonical: "/about/contact" },
};

const PHONE = "+91 78952 97837";
const EMAIL = "pntbansal8@gmail.com";

export default function Contact() {
  return (
    <>
      <PageHead eyebrow="About" title="Contact" intro="Questions, corrections or seva: please write or call." />
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-6">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Param Sundar Das</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            <li>
              <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="inline-flex items-center gap-3 text-[var(--fg)] hover:text-[var(--accent)]">
                <Phone size={18} className="text-[var(--accent)]" aria-hidden />
                <span>{PHONE}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`} className="inline-flex items-center gap-3 break-all text-[var(--fg)] hover:text-[var(--accent)]">
                <Mail size={18} className="shrink-0 text-[var(--accent)]" aria-hidden />
                <span>{EMAIL}</span>
              </a>
            </li>
          </ul>
        </article>
        <p className="mt-10">
          <Link href="/about" className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">← About</Link>
        </p>
      </div>
    </>
  );
}
