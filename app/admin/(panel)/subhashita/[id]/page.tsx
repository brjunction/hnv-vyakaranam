import DailyItemEditPage from "@/components/admin/DailyItemEditPage";
export const metadata = { title: "Edit Subhāṣita" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DailyItemEditPage pool="subhashita" idParam={(await params).id} />;
}
