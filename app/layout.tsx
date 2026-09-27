import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://harinamamrta.org"),
  title: {
    default: "Hari-nāmāmṛta Vyākaraṇa — The Masterpiece of Sanskrit Grammar",
    template: "%s | Hari-nāmāmṛta Vyākaraṇa",
  },
  description:
    "The complete sūtras, vṛtti, and translation of Śrīla Rūpa Gosvāmī's Hari-nāmāmṛta Vyākaraṇa — the most relishable grammar in the Sanskrit language.",
  keywords: [
    "Hari-namamrta Vyakarana",
    "Rupa Gosvami grammar",
    "Sanskrit grammar",
    "Vaishnava vyakarana",
    "Panini grammar alternative",
  ],
  openGraph: {
    title: "Hari-nāmāmṛta Vyākaraṇa — The Masterpiece of Sanskrit Grammar",
    description:
      "Explore the sūtras, vṛtti, and translations of Śrīla Rūpa Gosvāmī's Hari-nāmāmṛta Vyākaraṇa.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
  rel="icon"
  href="hnvlogo.png"
  sizes="<generated>"
/>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">
        <Header />
        <main className="min-h-[70vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
