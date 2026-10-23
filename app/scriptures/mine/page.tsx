import type { Metadata } from "next";
import MyStudy from "@/components/scriptures/MyStudy";

export const metadata: Metadata = { title: "My bookmarks & notes", robots: { index: false } };

export default function Mine() {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-16 pt-12">
      <MyStudy />
    </div>
  );
}
