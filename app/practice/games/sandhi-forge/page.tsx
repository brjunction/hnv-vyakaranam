import GamePage, { gameMetadata } from "@/components/games/GamePage";

export const revalidate = 86400;
export const metadata = gameMetadata("sandhi-forge");

export default function Page() {
  return <GamePage id="sandhi-forge" />;
}
