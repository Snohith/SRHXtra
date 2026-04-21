import Link from "next/link";

import type { Fixture } from "@/lib/content/schedule";
import { Badge } from "@/components/ui/Badge";

interface FixtureCardProps {
  fixture: Fixture;
}

export function FixtureCard({ fixture }: FixtureCardProps) {
  const isCompleted = fixture.status === "completed";
  
  return (
    <article className="glass-panel group p-8 transition-all hover:bg-white/5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Badge tone={isCompleted ? "neutral" : "accent"}>{fixture.status}</Badge>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">{fixture.competition}</span>
        </div>
        <Badge tone="neutral" className="border-white/10 bg-white/5">{fixture.homeAway}</Badge>
      </div>
      
      <div className="mt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Matchday Encounter</p>
        <h3 className="mt-2 text-3xl font-black uppercase tracking-tight text-white group-hover:text-accent transition-colors">
          SRH <span className="text-muted/40">vs</span> {fixture.opponent}
        </h3>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-white/5 pt-8">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Schedule</span>
          <span className="text-sm font-bold text-white">{fixture.date} • {fixture.time}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Venue</span>
          <span className="text-sm font-bold text-white">{fixture.venue}</span>
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
            href={`/match-coverage/${fixture.reportSlug}/`} 
            className="text-[10px] font-bold uppercase tracking-[0.3em] text-white underline decoration-accent underline-offset-8 transition-all hover:text-accent"
          >
            Open Tactical Report
          </Link>
        </div>
      ) : null}
    </article>
  );
}

