import { PlayerOfTheSeason } from "@/components/home/PlayerOfTheSeason";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH Player of the Season — IPL 2026",
  description: "Heinrich Klaasen's IPL 2026 season for Sunrisers Hyderabad.",
  path: "/player-poll/",
});

export default function PlayerPollPage() {
  return (
    <PlayerOfTheSeason />
  );
}
