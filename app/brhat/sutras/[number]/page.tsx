import { SutraPage, sutraMetadata } from "@/lib/hnv/sutraRoute";

export const revalidate = 86400;
export const dynamicParams = true;
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: { params: Promise<{ number: string }> }) {
  return sutraMetadata("brhat", (await params).number);
}

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  return <SutraPage edition="brhat" number={(await params).number} />;
}
