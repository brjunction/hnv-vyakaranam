import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import IastKeyboard from "@/components/tools/IastKeyboard";

export const metadata: Metadata = {
  alternates: { canonical: "/tools/text/keyboard" },
  title: "IAST Keyboard",
  description: "Type ā, ṛ, ṣ, ṇ … easily: press Shift after a letter to add its diacritic.",
};

export default function KeyboardPage() {
  return (
    <>
      <PageHead title="IAST Keyboard" intro="Type Sanskrit in IAST with any keyboard: a letter, then Shift, gives its diacritic." />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <IastKeyboard />
      </div>
    </>
  );
}
