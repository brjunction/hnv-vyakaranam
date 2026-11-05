import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import SandhiTool from "@/components/tools/SandhiTool";
import { getFeatures } from "@/lib/features";
import ComingSoon from "@/components/tools/ComingSoon";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/grammar/sandhi" },
  title: "Sandhi Joiner & Splitter",
  description: "Join words or split a joined form by the sandhi sūtras of Harināmāmṛta-vyākaraṇa — every change shown with its sūtra.",
};
export const revalidate = 3600;

export default async function SandhiPage() {
  if (!(await getFeatures())["tool-sandhi"]) return <ComingSoon name="Sandhi Joiner & Splitter" />;
  return (
    <>
      <PageHead title="Sandhi Joiner & Splitter" intro="Type words to join them, or a joined form to split it. Every change is shown with the Madhyama sūtra (41–86) that makes it." />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <SandhiTool />
      </div>
    </>
  );
}
