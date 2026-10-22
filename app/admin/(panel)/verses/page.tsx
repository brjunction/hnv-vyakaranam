import DailyPoolPage from "@/components/admin/DailyPoolPage";
export const metadata = { title: "Verse of the Day" };
export default function Page() {
  return <DailyPoolPage pool="verse_of_day" />;
}
