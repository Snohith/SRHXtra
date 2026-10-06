import { NextMatchHero } from "@/components/schedule/NextMatchHero";
import { ScheduleTabs } from "@/components/schedule/ScheduleTabs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getFixturesByStatus, getNextFixture, getSchedule } from "@/lib/content/schedule";
import type { Fixture } from "@/lib/content/schedule";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSportsEventJsonLd } from "@/lib/seo/jsonld";
import { getTeamInfo } from "@/lib/utils/team-info";

import { assertLiveFranchise, generateFranchiseStaticParams } from "@/lib/content/franchise-route";

export const metadata = buildPageMetadata({
  title: "SRH IPL 2026 Schedule — Fixtures and Results",
  description: "Every Sunrisers Hyderabad fixture for IPL 2026: dates, venues and results.",
  path: "/sunrisers-hyderabad/schedule/",
});


export const dynamicParams = false;

export function generateStaticParams() {
  return generateFranchiseStaticParams();
}

type FixtureOutcome = "W" | "L";

function fixtureOutcome(result: string | null | undefined): FixtureOutcome | null {
  if (!result) {
    return null;
  }

  return result.startsWith("Sunrisers Hyderabad") ? "W" : "L";
}

// Playoffs are staged at neutral venues but tagged home/away in the source
// data, so league-stage splits exclude any eliminator/qualifier/final.
function isPlayoff(fixture: Fixture) {
  return /^(eliminator|qualifier|final)-/.test(fixture.reportSlug ?? fixture.slug);
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDayMonth(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);

  if (!year || !month || !day) {
    return isoDate;
  }

  return `${day} ${MONTH_SHORT[month - 1]}`;
}

interface CampaignSplits {
  wins: number;
  losses: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  bestStreak: number;
  streakLabel: string;
  monthLine: string;
}

function buildCampaignSplits(fixtures: Fixture[]): CampaignSplits | null {
  const league = fixtures.filter(
    (fixture) => fixture.status === "completed" && !isPlayoff(fixture),
  );

  if (league.length === 0) {
    return null;
  }

  let wins = 0;
  let homeWins = 0;
  let awayWins = 0;
  let bestStreak = 0;
  let bestStart = "";
  let bestEnd = "";
  let run = 0;
  let runStart = "";
  const months = new Map<string, { wins: number; losses: number }>();

  for (const fixture of league) {
    if (fixtureOutcome(fixture.result) !== "W") {
      run = 0;
      const key = fixture.date.slice(0, 7);
      const entry = months.get(key) ?? { wins: 0, losses: 0 };
      entry.losses += 1;
      months.set(key, entry);
      continue;
    }

    wins += 1;

    if (fixture.homeAway === "home") {
      homeWins += 1;
    } else {
      awayWins += 1;
    }

    if (run === 0) {
      runStart = fixture.date;
    }

    run += 1;

    if (run > bestStreak) {
      bestStreak = run;
      bestStart = runStart;
      bestEnd = fixture.date;
    }

    const key = fixture.date.slice(0, 7);
    const entry = months.get(key) ?? { wins: 0, losses: 0 };
    entry.wins += 1;
    months.set(key, entry);
  }

  const losses = league.length - wins;
  const monthLine = [...months.entries()]
    .sort(([left], [right]) => (left < right ? -1 : 1))
    .map(([key, entry]) => {
      const month = MONTH_SHORT[Number(key.slice(5, 7)) - 1] ?? key;
      return `${month} ${entry.wins}–${entry.losses}`;
    })
    .join(" · ");

  return {
    wins,
    losses,
    homeWins,
    homeLosses: league.filter((f) => f.homeAway === "home").length - homeWins,
    awayWins,
    awayLosses: league.filter((f) => f.homeAway !== "home").length - awayWins,
    bestStreak,
    streakLabel: bestStreak > 1 ? `${shortDayMonth(bestStart)} – ${shortDayMonth(bestEnd)}` : "League stage",
    monthLine,
  };
}

function CampaignBand({ campaign }: { campaign: CampaignSplits }) {
  const tiles = [
    { value: `${campaign.wins}–${campaign.losses}`, label: "League record" },
    { value: `${campaign.homeWins}–${campaign.homeLosses}`, label: "At home" },
    { value: `${campaign.awayWins}–${campaign.awayLosses}`, label: "Away" },
    { value: campaign.bestStreak > 1 ? `${campaign.bestStreak} straight` : `${campaign.bestStreak}`, label: "Best streak" },
  ];

  return (
    <section className="glass-panel p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Campaign at a glance</p>
          <p className="mt-1 text-lg font-black uppercase tracking-tight text-foreground">League stage splits</p>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{campaign.monthLine}</p>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="min-w-0 rounded-2xl border border-border bg-black/[0.02] px-4 py-4 text-center">
            <dd className="break-words text-xl font-black tracking-tight text-foreground sm:text-3xl">{tile.value}</dd>
            <dt className="mt-1 break-words text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{tile.label}</dt>
          </div>
        ))}
      </dl>
      {campaign.bestStreak > 1 ? (
        <p className="mt-4 text-xs font-medium text-muted">
          Best run: {campaign.bestStreak} consecutive wins ({campaign.streakLabel}).
        </p>
      ) : null}
    </section>
  );
}

export default async function SchedulePage({ params }: { params: Promise<{ franchise: string }> }) {
  await assertLiveFranchise(params);
  const schedule = getSchedule();
  const upcomingFixtures = getFixturesByStatus("upcoming");
  const completedFixtures = getFixturesByStatus("completed");
  const nextMatch = getNextFixture() || completedFixtures[completedFixtures.length - 1];
  const campaign = buildCampaignSplits(schedule.fixtures);
  const sportsEvents = getSportsEventJsonLd(
    schedule.fixtures.map((fixture) => {
      const opponent = getTeamInfo(fixture.opponent);
      const isHome = fixture.homeAway === "home";
      return {
        name: isHome
          ? `Sunrisers Hyderabad vs ${opponent.name}`
          : `${opponent.name} vs Sunrisers Hyderabad`,
        date: fixture.date,
        time: fixture.time,
        venue: fixture.venue,
        url: fixture.reportSlug
          ? `/sunrisers-hyderabad/match-coverage/${fixture.reportSlug}/`
          : "/sunrisers-hyderabad/schedule/",
      };
    }),
  );

  return (
    <div className="page-stack">
      <h1 className="sr-only">Sunrisers Hyderabad fixtures, results and match dates</h1>
      <script
        id="schedule-sports-events-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(sportsEvents) }}
      />
      <div className="section-stack">
        {nextMatch && <NextMatchHero fixture={nextMatch} />}
      </div>

      {campaign ? <CampaignBand campaign={campaign} /> : null}

      <section className="section-stack">
        <SectionHeader
          title="Full Season"
        />

        <ScheduleTabs
          upcoming={upcomingFixtures}
          completed={completedFixtures}
          full={schedule.fixtures}
        />
      </section>
    </div>
  );
}
