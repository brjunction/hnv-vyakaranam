import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, Mail, Phone, Smartphone } from "lucide-react";
import PageHead from "@/components/PageHead";

export const metadata: Metadata = {
  title: "Sponsor this website",
  description: "Help keep Harināmāmṛta-Vyākaraṇam online — sponsor the hosting and database costs.",
  alternates: { canonical: "/about/sponsor" },
};

const PHONE = "+91 78952 97837";
const EMAIL = "pntbansal8@gmail.com";

export default function Sponsor() {
  return (
    <>
      <PageHead eyebrow="About" title="Sponsor this website" intro="Help keep Śrīla Jīva Gosvāmī's grammar online and free for everyone." />
      <div className="mx-auto max-w-4xl px-5 pb-16 pt-6">
        <article className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--bg-2)] p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <HeartHandshake size={28} className="text-[var(--accent)]" aria-hidden />
            <h2 className="text-xl font-semibold">Become a sponsor</h2>
          </div>
          <p className="mt-4 leading-relaxed">
            Every sūtra, scripture, dictionary and tool on this site is free. Keeping it online has real monthly costs: the database that holds all the
            content and the servers that deliver it. Any sponsorship, small or large, helps keep this seva running.
          </p>
          <h3 className="mt-6 font-semibold">How to sponsor</h3>
          <ul className="mt-3 grid gap-3 text-sm">
            <li className="flex items-center gap-3">
              <Smartphone size={18} className="text-[var(--accent)]" aria-hidden />
              <span>
                Pay by <b>UPI / Google Pay / PhonePe / Paytm</b> to <b>{PHONE}</b>
              </span>
            </li>
            <li>
              <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="inline-flex items-center gap-3 hover:text-[var(--accent)]">
                <Phone size={18} className="text-[var(--accent)]" aria-hidden /> Call or WhatsApp: {PHONE}
              </a>
            </li>
            <li>
              <a href={`mailto:${EMAIL}?subject=Sponsoring%20the%20HNV%20website`} className="inline-flex items-center gap-3 break-all hover:text-[var(--accent)]">
                <Mail size={18} className="shrink-0 text-[var(--accent)]" aria-hidden /> {EMAIL}
              </a>
            </li>
          </ul>
          <p className="mt-5 text-sm text-[var(--fg-muted)]">Please contact us after paying so we can thank you. Hare Kṛṣṇa.</p>
        </article>
        <p className="mt-10">
          <Link href="/about" className="text-sm text-[var(--fg-muted)] hover:text-[var(--accent)]">← About</Link>
        </p>
      </div>
    </>
  );
}
