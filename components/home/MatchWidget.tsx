import Link from "next/link";

import type { Fixture } from "@/lib/content/schedule";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getTeamInfo } from "@/lib/utils/team-info";

interface MatchWidgetProps {
  nextFixture: Fixture | null;
  latestResult: Fixture | null;
  seasonSummary?: {
    wins: number;
    losses: number;
    position: string;
  } | null;
}

function getFixtureTitle(fixture: Fixture) {
  const srh = getTeamInfo("SRH");
  const opponent = getTeamInfo(fixture.opponent);
  const isHome = fixture.homeAway === "home";
  const leftTeam = isHome ? srh : opponent;
  const rightTeam = isHome ? opponent : srh;

  return `${leftTeam.code} vs ${rightTeam.code}`;
}

export function MatchWidget({ nextFixture, latestResult, seasonSummary = null }: MatchWidgetProps) {
  return (
    <aside className="story-surface h-full min-w-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <Badge tone="accent">Matchday desk</Badge>
        <Link href="/sunrisers-hyderabad/schedule/" className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition hover:text-accent">
          Full schedule
        </Link>
      </div>
      {nextFixture || latestResult ? (
        <div className="mt-8 space-y-6">
          {nextFixture ? (
            <div className="min-w-0 space-y-4 rounded-2xl border border-border bg-black/[0.02] p-5 sm:p-6">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Next fixture</span>
                <Badge tone="success">{nextFixture.homeAway}</Badge>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">{nextFixture.competition}</p>
                <h2 className="mt-1 break-words text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">{getFixtureTitle(nextFixture)}</h2>
              </div>
              <div className="space-y-1">
                <p className="break-words text-sm font-medium text-muted">
                  {nextFixture.date} • {nextFixture.time}
                </p>
                <p className="break-words text-xs text-muted">{nextFixture.venue}</p>
              </div>
            </div>
          ) : null}

          {latestResult ? (
            <div className="min-w-0 space-y-4 rounded-2xl border border-border bg-black/[0.01] p-5 sm:p-6">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Latest result</span>
                <Badge tone="neutral">{latestResult.homeAway}</Badge>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{latestResult.competition}</p>
                <h3 className="mt-1 break-words text-lg font-black uppercase tracking-tight text-foreground sm:text-xl">{getFixtureTitle(latestResult)}</h3>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted">
                  {latestResult.date}
                </p>
                {latestResult.result ? <p className="break-words text-sm font-black text-accent">{latestResult.result}</p> : null}
              </div>
              {latestResult.reportSlug ? (
                <div className="pt-2">
                  <Button href={`/sunrisers-hyderabad/match-coverage/${latestResult.reportSlug}/`} size="sm" variant="secondary" className="w-full">
                    Match Report
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {!nextFixture && seasonSummary ? (
            <div className="flex min-w-0 flex-col gap-4 rounded-2xl bg-black px-5 py-5 text-white min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Season complete</p>
                <p className="mt-1 break-words text-xl font-black tracking-tight sm:text-2xl">
                  {seasonSummary.wins}W – {seasonSummary.losses}L
                  <span className="ml-3 text-sm font-bold uppercase tracking-[0.18em] text-[#ff6d00]">
                    {seasonSummary.position}
                  </span>
                </p>
              </div>
              <Link
                href="/sunrisers-hyderabad/schedule/"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#ff6d00] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#e05f00]"
              >
                Archive
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-8 body-copy">No game listed here yet. The next confirmed fixture will show up once it's announced.</p>
      )}
    </aside>
  );
}
