import { PlayerSeasonPoll } from "@/components/home/PlayerSeasonPoll";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH Player Poll — Player of the Season Vote",
  description: "Vote for SRH's IPL 2026 Player of the Season.",
  path: "/player-poll/",
});

export default function PlayerPollPage() {
  return (
    <div className="page-stack">
      <PlayerSeasonPoll pollSlug="srh-player-of-the-season-2026" />
    </div>
  );
}
