import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import ComingSoon from "@/components/tools/ComingSoon";
import DeclensionTool from "@/components/tools/DeclensionTool";
import { getFeatures } from "@/lib/features";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/grammar/declension" },
  title: "Declensions — nāma & dhātu",
  description: "Every form of a nāma or dhātu by Harināmāmṛta-vyākaraṇa, with the Madhyama sūtras that make it.",
};
export const revalidate = 3600;

export default async function DeclensionPage() {
  if (!(await getFeatures())["tool-declensions"]) return <ComingSoon name="Declensions — nāma & dhātu" />;
  return (
    <>
      <PageHead title="Declensions — nāma & dhātu" intro="Type a nāma or a dhātu. Every form is made by the Madhyama sūtras; click a form to see them." />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <DeclensionTool />
      </div>
    </>
  );
}
