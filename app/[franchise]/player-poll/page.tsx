import { PlayerPoll } from "@/components/poll/PlayerPoll";
import { getPollPageData } from "@/lib/content/poll-page";
import { buildPageMetadata } from "@/lib/seo/metadata";

import { assertLiveFranchise, generateFranchiseStaticParams } from "@/lib/content/franchise-route";

export const metadata = buildPageMetadata({
  title: "SRH Player of the Season Results — IPL 2026",
  description: "Voting is closed: the fans' player of IPL 2026, final standings and the verified season numbers.",
  path: "/sunrisers-hyderabad/player-poll/",
});

export const dynamicParams = false;

export function generateStaticParams() {
  return generateFranchiseStaticParams();
}

export default async function PlayerPollPage({ params }: { params: Promise<{ franchise: string }> }) {
  await assertLiveFranchise(params);
  const data = getPollPageData();

  return <PlayerPoll data={data} />;
}
