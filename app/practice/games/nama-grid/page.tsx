import GamePage, { gameMetadata } from "@/components/games/GamePage";

export const revalidate = 86400;
export const metadata = gameMetadata("nama-grid");

export default function Page() {
  return <GamePage id="nama-grid" />;
}
