import { PlayerSeasonPoll } from "@/components/home/PlayerSeasonPoll";
import { PlayerOfTheSeason } from "@/components/home/PlayerOfTheSeason";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH Player Poll — IPL 2026",
  description: "Who will be the Player of the Season? Vote for your favourite player or read the campaign overview.",
  path: "/player-poll/",
});

export default function PlayerPollPage() {
  return (
    <div className="page-stack">
      <PlayerSeasonPoll pollSlug="srh-player-of-the-season-2026" />
      <PlayerOfTheSeason />
    </div>
  );
}
