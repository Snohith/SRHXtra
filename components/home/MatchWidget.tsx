import Link from "next/link";

import type { Fixture } from "@/lib/content/schedule";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getTeamInfo } from "@/lib/utils/team-info";

interface MatchWidgetProps {
  nextFixture: Fixture | null;
  latestResult: Fixture | null;
}

function getFixtureTitle(fixture: Fixture) {
  const srh = getTeamInfo("SRH");
  const opponent = getTeamInfo(fixture.opponent);
  const isHome = fixture.homeAway === "home";
  const leftTeam = isHome ? srh : opponent;
  const rightTeam = isHome ? opponent : srh;

  return `${leftTeam.code} vs ${rightTeam.code}`;
}

export function MatchWidget({ nextFixture, latestResult }: MatchWidgetProps) {
  return (
    <aside className="story-surface h-full">
      <div className="flex items-center justify-between gap-3">
        <Badge tone="accent">Matchday desk</Badge>
        <Link href="/schedule/" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition hover:text-accent">
          Full schedule
        </Link>
      </div>
      {nextFixture || latestResult ? (
        <div className="mt-8 space-y-6">
          {nextFixture ? (
            <div className="space-y-4 rounded-2xl border border-border bg-black/[0.02] p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Next fixture</span>
                <Badge tone="success">{nextFixture.homeAway}</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">{nextFixture.competition}</p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground">{getFixtureTitle(nextFixture)}</h2>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted">
                  {nextFixture.date} • {nextFixture.time}
                </p>
                <p className="text-xs text-muted">{nextFixture.venue}</p>
              </div>
            </div>
          ) : null}

          {latestResult ? (
            <div className="space-y-4 rounded-2xl border border-border bg-black/[0.01] p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Latest result</span>
                <Badge tone="neutral">{latestResult.homeAway}</Badge>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{latestResult.competition}</p>
                <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-foreground">{getFixtureTitle(latestResult)}</h3>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted">
                  {latestResult.date}
                </p>
                {latestResult.result ? <p className="text-sm font-black text-accent">{latestResult.result}</p> : null}
              </div>
              {latestResult.reportSlug ? (
                <div className="pt-2">
                  <Button href={`/match-coverage/${latestResult.reportSlug}/`} size="sm" variant="secondary" className="w-full">
                    Match Report
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-8 body-copy">No fixture is listed right now. The next confirmed match will appear here once it is added.</p>
      )}
    </aside>
  );
}
