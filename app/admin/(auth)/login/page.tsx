import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isAuthConfigured, isDbConfigured } from "@/lib/env";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/admin");
  const { next } = await searchParams;
  const missing = [!isDbConfigured && "DATABASE_URL", !isAuthConfigured && "AUTH_SECRET"].filter(Boolean);

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
      <aside className="hero-night hidden lg:flex flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <Image src="/hnvlogo.png" alt="" width={40} height={40} />
          <span className="font-semibold">Harināmāmṛta Vyākaraṇam</span>
        </div>
        <div>
          <p className="font-devanagari text-3xl xl:text-4xl leading-relaxed mb-5" lang="sa-Deva">
            स्वल्पायुषां कलियुगेऽत्र नृणां शमिच्छन्
            <br />
            शब्दानुशासनमहाजलधिं विमथ्य ।
            <br />
            नामामृतं समददाद्य इदं कृपालुः
            <br />
            स श्रीलजीवचरणः शरणं ममास्तु ॥
          </p>
          <p className="text-[var(--hero-muted)] max-w-md leading-relaxed">
            Desiring the welfare of the short-lived people in this age of Kali, the compassionate Śrīla Jīva Gosvāmī churned
            the great ocean of Sanskrit grammar and bestowed upon them this Hari-nāmāmṛta-vyākaraṇa. May he be my shelter.
          </p>
        </div>
        <p className="text-sm text-[var(--hero-muted)]">Editors&apos; dashboard</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-semibold text-4xl mb-2">Sign in</h1>
          <p className="text-[var(--fg-muted)] mb-8">Manage the sūtras, the Verse of the Day and Subhāṣitas.</p>
          {missing.length > 0 ? (
            <div className="rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-4 text-sm">
              This deployment is missing {missing.join(" and ")}. Add {missing.length > 1 ? "them" : "it"} in
              Vercel → Settings → Environment Variables, then redeploy.
            </div>
          ) : (
            <LoginForm next={next} />
          )}
        </div>
      </main>
    </div>
  );
}
