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
    <div className="glass-panel overflow-hidden border border-border shadow-xs bg-white">
      <div className="hidden grid-cols-[0.8fr_1.4fr_1fr_0.8fr] gap-6 border-b border-neutral-100 bg-neutral-50 px-8 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 md:grid">
        <span>Date & Time</span>
        <span>Game</span>
        <span>Venue</span>
        <span className="text-right">Result</span>
      </div>
      <div className="divide-y divide-neutral-100">
        {fixtures.map((fixture) => {
          const opponent = getTeamInfo(fixture.opponent);
          const srh = getTeamInfo("SRH");
          
          const isHome = fixture.homeAway === "home";
          const leftTeam = isHome ? srh : opponent;
          const rightTeam = isHome ? opponent : srh;
          
          return (
            <div
              key={fixture.id}
              className="grid gap-4 px-4 py-5 transition-colors hover:bg-neutral-50 sm:px-6 md:grid-cols-[0.8fr_1.4fr_1fr_0.8fr] md:items-center md:gap-6 md:px-8 md:py-6"
            >
              {/* Column 1: Date & Time */}
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-black text-foreground">{fixture.date}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">{fixture.time}</p>
              </div>

              {/* Column 2: Encounter (Teams & Logos) */}
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex -space-x-1.5 shrink-0">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-neutral-200 bg-white p-1">
                    {leftTeam.logo && <Image src={leftTeam.logo} alt={leftTeam.name} fill className="object-contain" unoptimized />}
                  </div>
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-neutral-200 bg-white p-1">
                    {rightTeam.logo && <Image src={rightTeam.logo} alt={rightTeam.name} fill className="object-contain" unoptimized />}
                  </div>
                </div>
                <div className="min-w-0 flex flex-col">
                  <p className="text-sm font-black uppercase tracking-tight text-foreground">
                    {leftTeam.code} <span className="text-neutral-400 font-bold lowercase text-[10px]">vs</span> {rightTeam.code}
                  </p>
                  <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-neutral-400 mt-0.5">
                    <span className="text-[#ff6d00]">{fixture.competition}</span>
                    <span className="h-1 w-1 rounded-full bg-neutral-300" />
                    <span>{fixture.homeAway}</span>
                  </div>
                </div>
              </div>
            
              {/* Column 3: Venue */}
              <p className="text-xs font-semibold text-neutral-500 md:line-clamp-2">{fixture.venue}</p>

              {/* Column 4: Outcome */}
              <div className="flex flex-col items-start gap-1 md:items-end">
                {fixture.status === "completed" ? (
                  <div className="flex flex-col items-start md:items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cx(
                        "h-2 w-2 rounded-full",
                        fixture.outcome === "won" ? "bg-emerald-500" : "bg-rose-500"
                      )} />
                      <span className={cx(
                        "text-xs font-black uppercase tracking-widest",
                        fixture.outcome === "won" ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {fixture.outcome === "won" ? "Won" : "Lost"}
                      </span>
                    </div>
                    {fixture.margin && (
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">
                        {fixture.margin}
                      </p>
                    )}
                    {fixture.reportSlug && (
                      <Link
                        href={`/sunrisers-hyderabad/match-coverage/${fixture.reportSlug}/`}
                        className="text-[9px] font-bold uppercase tracking-wider text-[#ff6d00] hover:underline"
                      >
                        Read report
                      </Link>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500 border border-neutral-200">
                    Upcoming
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
