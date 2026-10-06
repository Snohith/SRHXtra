import Script from "next/script";

import { PlayerProfile } from "@/components/squad/PlayerProfile";
import { PlayerCard } from "@/components/squad/PlayerCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { resolvePlayerImage } from "@/lib/content/images";
import { getPlayerBySlug, getPlayerSlugs, getRelatedPlayers } from "@/lib/content/squad";
import { getSeasonPlayerStat, getSeasonPlayerStats } from "@/lib/content/player-season-stats";
import { getBreadcrumbJsonLd, getPlayerJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

import { assertLiveFranchiseValue } from "@/lib/content/franchise-route";

export const dynamicParams = false;

function rankOf(sortedSlugs: string[], slug: string) {
  const index = sortedSlugs.indexOf(slug);
  return index === -1 ? null : index + 1;
}

/** Team-internal ranks computed live from the 2026 season aggregates. */
function buildSeasonRanks(slug: string): string[] {
  const all = getSeasonPlayerStats();
  const entry = all.find((p) => p.slug === slug);
  const ranks: string[] = [];

  if (!entry) return ranks;

  const byRuns = all
    .filter((p) => p.runs !== undefined)
    .sort((a, b) => (b.runs ?? 0) - (a.runs ?? 0))
    .map((p) => p.slug);
  const byStrikeRate = all
    .filter((p) => p.strikeRate !== undefined)
    .sort((a, b) => (b.strikeRate ?? 0) - (a.strikeRate ?? 0))
    .map((p) => p.slug);
  const bySixes = all
    .filter((p) => p.sixes !== undefined)
    .sort((a, b) => (b.sixes ?? 0) - (a.sixes ?? 0))
    .map((p) => p.slug);
  const byWickets = all
    .filter((p) => p.wickets !== undefined)
    .sort((a, b) => (b.wickets ?? 0) - (a.wickets ?? 0))
    .map((p) => p.slug);
  const byEconomy = all
    .filter((p) => p.economy !== undefined)
    .sort((a, b) => Number.parseFloat(a.economy ?? "99") - Number.parseFloat(b.economy ?? "99"))
    .map((p) => p.slug);

  const runs = rankOf(byRuns, slug);
  const sr = rankOf(byStrikeRate, slug);
  const sixes = rankOf(bySixes, slug);
  const wickets = rankOf(byWickets, slug);
  const economy = rankOf(byEconomy, slug);

  if (entry.primaryStat === "batting") {
    if (runs !== null) ranks.push(`#${runs} most runs for SRH in 2026`);
    if (sr !== null) ranks.push(`#${sr} strike rate in the squad`);
    if (sixes !== null) ranks.push(`#${sixes} for sixes in the squad`);
  }

  if (entry.primaryStat === "bowling") {
    if (wickets !== null) ranks.push(`#${wickets} most wickets for SRH in 2026`);
    if (economy !== null) ranks.push(`#${economy} economy in the squad`);
  }

  return ranks;
}

export function generateStaticParams() {
  return getPlayerSlugs().map((slug) => ({ franchise: "sunrisers-hyderabad", slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ franchise: string; slug: string }>;
}) {
  const { franchise, slug } = await params;
  assertLiveFranchiseValue(franchise);
  const player = getPlayerBySlug(slug);

  if (!player) {
    return {};
  }

  const playerImage = resolvePlayerImage(player);

  return buildPageMetadata({
    title: `${player.name} Profile — Sunrisers Hyderabad Squad`,
    description: player.bio ?? `Official squad profile for ${player.name}, ${player.role} for Sunrisers Hyderabad. View career stats, batting and bowling styles, and latest updates.`,
    path: `/sunrisers-hyderabad/squad/${player.slug}/`,
    image: playerImage.src,
    type: "profile",
    tags: [player.role, player.nationality, "SRH", "IPL 2026"],
  });
}

export default async function SquadPlayerPage({  params,
}: {
  params: Promise<{ franchise: string; slug: string }>;
}) {
  const { franchise, slug } = await params;
  assertLiveFranchiseValue(franchise);
  const player = getPlayerBySlug(slug);

  if (!player) {
    throw new Error(`Missing squad profile for slug: ${slug}`);
  }

  const relatedPlayers = getRelatedPlayers(player.slug);
  const season = getSeasonPlayerStat(player.slug);
  const seasonRanks = buildSeasonRanks(player.slug);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Squad", href: "/sunrisers-hyderabad/squad/" },
    { label: player.name },
  ];
  const jsonLd = [getBreadcrumbJsonLd(breadcrumbItems.map(({ label, href }) => ({ name: label, url: href ?? `/sunrisers-hyderabad/squad/${player.slug}/` }))), getPlayerJsonLd(player)];

  return (
    <div className="page-stack">
      <script
        id={`squad-jsonld-${player.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="section-stack">
        <Breadcrumbs items={breadcrumbItems} />
        <PlayerProfile player={player} season={season} seasonRanks={seasonRanks} />
      </div>
      {relatedPlayers.length ? (
        <section className="section-stack">
          <SectionHeader
            title="Continue exploring"
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedPlayers.map((entry) => (
              <PlayerCard key={entry.slug} player={entry} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
