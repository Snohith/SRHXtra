import Link from "next/link";

import type { Fixture } from "@/lib/content/schedule";
import { Badge } from "@/components/ui/Badge";
import { cx } from "@/lib/utils/classes";
import { getTeamInfo } from "@/lib/utils/team-info";
import Image from "next/image";

interface ScheduleTableProps {
  fixtures: Fixture[];
}

export function ScheduleTable({ fixtures }: ScheduleTableProps) {
  return (
    <div className="glass-panel overflow-hidden">
      <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_1fr] gap-6 border-b border-white/5 bg-white/5 px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted md:grid">
        <span>Fixture Encounter</span>
        <span>Schedule / Period</span>
        <span>Tactical Venue</span>
        <span>Outcome / Margin</span>
      </div>
      <div className="divide-y divide-white/5">
        {fixtures.map((fixture) => {
          const opponent = getTeamInfo(fixture.opponent);
          const srh = getTeamInfo("SRH");
          
          const isHome = fixture.homeAway === "home";
          const leftTeam = isHome ? srh : opponent;
          const rightTeam = isHome ? opponent : srh;
          
          return (
            <div
              key={fixture.id}
              className="grid gap-6 px-8 py-8 md:grid-cols-[1.2fr_1fr_0.8fr_1fr] md:items-center transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-5">
                <div className="relative flex -space-x-2 shrink-0">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/5 bg-white/5 p-1.5">
                    {leftTeam.logo && <Image src={leftTeam.logo} alt={leftTeam.name} fill className="object-contain" unoptimized />}
                  </div>
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/5 bg-white/5 p-1.5">
                    {rightTeam.logo && <Image src={rightTeam.logo} alt={rightTeam.name} fill className="object-contain" unoptimized />}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-base font-black tracking-tight text-white uppercase">
                    {leftTeam.code} <span className="text-muted/40 text-xs">vs</span> {rightTeam.code}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-accent">{fixture.competition}</span>
                    <span className="h-1 w-1 rounded-full bg-white/20" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">{fixture.homeAway}</span>
                  </div>
                </div>
              </div>
            
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-white">{fixture.date}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{fixture.time}</p>
            </div>

            <p className="text-sm font-medium text-muted">{fixture.venue}</p>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={fixture.outcome === "won" ? "accent" : "neutral"}>
                  {fixture.status}
                </Badge>
                {fixture.outcome ? (
                  <span
                    className={cx(
                      "text-[10px] font-black uppercase tracking-[0.2em]",
                      fixture.outcome === "won" ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {fixture.outcome}
                  </span>
                ) : null}
              </div>
              
              <div className="flex flex-col gap-1">
                {fixture.margin ? (
                  <p className="text-sm font-black text-white uppercase tracking-tight">
                    {fixture.margin}
                  </p>
                ) : fixture.result ? (
                  <p className="text-sm font-black text-white uppercase tracking-tight">{fixture.result}</p>
                ) : null}
                
                {fixture.playerOfTheMatch ? (
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                    POTM: <span className="text-accent">{fixture.playerOfTheMatch}</span>
                  </p>
                ) : null}
                {fixture.reportSlug ? (
                  <Link
                    href={`/match-coverage/${fixture.reportSlug}/`}
                    className="inline-flex text-[10px] font-bold uppercase tracking-[0.18em] text-accent underline decoration-accent/30 underline-offset-4 transition hover:text-orange-200"
                  >
                    Open report
                  </Link>
                ) : null}
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
