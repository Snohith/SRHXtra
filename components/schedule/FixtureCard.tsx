import Link from "next/link";

import type { Fixture } from "@/lib/content/schedule";
import { Badge } from "@/components/ui/Badge";
import { getTeamInfo } from "@/lib/utils/team-info";
import Image from "next/image";

interface FixtureCardProps {
  fixture: Fixture;
}

export function FixtureCard({ fixture }: FixtureCardProps) {
  const isCompleted = fixture.status === "completed";
  const opponent = getTeamInfo(fixture.opponent);
  const srh = getTeamInfo("SRH");
  
  const isHome = fixture.homeAway === "home";
  const leftTeam = isHome ? srh : opponent;
  const rightTeam = isHome ? opponent : srh;

  return (
    <article className="glass-panel group min-w-0 p-5 transition-all hover:bg-black/[0.02] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <Badge tone={isCompleted ? "neutral" : "accent"}>{fixture.status}</Badge>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">{fixture.competition}</span>
        </div>
        <Badge tone="neutral">{fixture.homeAway}</Badge>
      </div>
      
      <div className="mt-8 flex flex-col gap-5 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">League Fixture</p>
          <h3 className="break-words text-2xl font-black uppercase tracking-tight text-foreground group-hover:text-accent transition-colors sm:text-3xl">
            {leftTeam.code} <span className="text-muted/40">vs</span> {rightTeam.code}
          </h3>
          <p className="break-words text-[10px] font-bold uppercase tracking-widest text-muted/60">
            {leftTeam.name} vs {rightTeam.name}
          </p>
        </div>

        <div className="relative flex shrink-0 -space-x-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-surface bg-surface-strong p-2">
            {leftTeam.logo && <Image src={leftTeam.logo} alt={leftTeam.name} fill className="object-contain p-2" unoptimized />}
          </div>
          <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-surface bg-surface-strong p-2">
            {rightTeam.logo && <Image src={rightTeam.logo} alt={rightTeam.name} fill className="object-contain p-2" unoptimized />}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-border pt-8">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Schedule</span>
          <span className="text-sm font-bold text-foreground">{fixture.date} • {fixture.time}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Venue</span>
          <span className="text-sm font-bold text-foreground">{fixture.venue}</span>
        </div>
      </div>

      {fixture.result ? (
        <div className="mt-6 rounded-xl bg-accent/10 border border-accent/20 p-4">
          <p className="text-sm font-black text-accent uppercase tracking-wider">{fixture.result}</p>
        </div>
      ) : null}

      {fixture.reportSlug ? (
        <div className="mt-8">
          <Link 
            href={`/sunrisers-hyderabad/match-coverage/${fixture.reportSlug}/`} 
            className="text-[10px] font-bold uppercase tracking-[0.3em] text-foreground underline decoration-accent underline-offset-8 transition-all hover:text-accent"
          >
            Read match report
          </Link>
        </div>
      ) : null}
    </article>
  );
}

