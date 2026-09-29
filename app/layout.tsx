import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Harināmāmṛta Vyākaraṇa — The Masterpiece of Sanskrit Grammar",
    template: "%s | Harināmāmṛta Vyākaraṇa",
  },
  description:
    "The complete sūtras, vṛtti, and translation of Śrīla Jīva Gosvāmī's Harināmāmṛta Vyākaraṇa — the most relishable grammar in the Sanskrit language.",
  keywords: [
    "Harinamamrta Vyakarana",
    "Jiva Gosvami grammar",
    "Sanskrit grammar",
    "Vaishnava vyakarana",
    "HNV grammar",
    "Panini grammar alternative",
  ],
  openGraph: {
    title: "Harināmāmṛta Vyākaraṇa — The Masterpiece of Sanskrit Grammar",
    description:
      "Explore the sūtras, vṛtti, and translations of Śrīla Jīva Gosvāmī's Harināmāmṛta Vyākaraṇa.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
  rel="icon"
  href="/hnvlogo.png"
  sizes="<generated>"
/>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <meta name="google-site-verification" content="A0wYp6OHY16TtZb5ua8xmcSaN4D1YiLzLHOfULCdFZw" />
      </head>
      <body className="antialiased">
        <Header />
        <main className="min-h-[70vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
