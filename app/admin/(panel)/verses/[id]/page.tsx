import DailyItemEditPage from "@/components/admin/DailyItemEditPage";
export const metadata = { title: "Edit verse" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DailyItemEditPage pool="verse_of_day" idParam={(await params).id} />;
}
