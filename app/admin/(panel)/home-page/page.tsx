import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PageHeader, Panel } from "@/components/admin/ui";
import PrabhupadaForm from "@/components/admin/home/PrabhupadaForm";

export const metadata = { title: "Home page" };
export const dynamic = "force-dynamic";

export default async function HomePageAdmin() {
  await requireUser("editor");
  const [row] = await getDb().select().from(siteSettings).where(eq(siteSettings.key, "home.prabhupada")).limit(1);
  const v = (row?.value as { author?: string; imageUrl?: string; quotes?: { text: string; source: string }[] }) ?? {};
  return (
    <>
      <PageHeader
        title="Home page"
        intro="The Śrīla Prabhupāda section on the home page (between the Ṣaḍ-Gosvāmīs and Amṛta’s prayers)."
        actions={
          <a href="/" target="_blank" rel="noreferrer" className="a-btn a-btn-outline">
            View <ExternalLink size={14} />
          </a>
        }
      />
      <Panel title="Śrīla Prabhupāda’s words">
        <PrabhupadaForm v={{ author: v.author ?? "", imageUrl: v.imageUrl ?? "", quotes: v.quotes ?? [] }} />
      </Panel>
    </>
  );
}
