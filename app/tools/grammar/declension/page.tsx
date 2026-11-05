import type { Metadata } from "next";
import ComingSoon from "@/components/tools/ComingSoon";

export const metadata: Metadata = { alternates: { canonical: "/tools/grammar/declension" }, title: "Declensions — nāma & dhātu" };
export const revalidate = 3600;

export default function DeclensionPage() {
  return <ComingSoon name="Declensions — nāma & dhātu" />;
}
