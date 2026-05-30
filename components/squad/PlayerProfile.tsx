import Image from "next/image";

import type { Player } from "@/lib/content/squad";
import { resolvePlayerImage } from "@/lib/content/images";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";

interface PlayerProfileProps {
  player: Player;
}

export function PlayerProfile({ player }: PlayerProfileProps) {
  const playerImage = resolvePlayerImage(player);

  return (
    <article className="relative flex flex-col gap-12">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-border bg-surface shadow-premium group">
          <Image 
            alt={playerImage.alt} 
            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            height={1000} 
            src={playerImage.src} 
            width={800} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">{player.role}</Badge>
              {player.captain ? <Badge tone="neutral">Captain</Badge> : null}
            </div>
            <h1 className="mt-4 editorial-title leading-none !text-5xl text-white sm:!text-6xl">{player.name}</h1>
          </div>
        </div>

        <div className="section-stack">
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Full Name</p>
              <p className="mt-2 text-2xl font-black text-foreground">{player.fullName}</p>
            </div>
            
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Biography</p>
              <p className="mt-4 text-xl leading-relaxed text-muted sm:text-2xl">
                {player.bio ?? "Official SRH roster member. Biography and season analysis currently being updated for the latest campaign."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="glass-panel px-6 py-3 flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Nationality</span>
                <span className="text-sm font-bold text-foreground">{player.nationality}</span>
              </div>
              {player.jerseyNumber ? (
                <div className="glass-panel px-6 py-3 flex items-center gap-3 border-accent/20">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Squad No.</span>
                  <span className="text-sm font-bold text-foreground">{player.jerseyNumber}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatItem label="Batting Style" value={player.battingStyle} />
            <StatItem label="Bowling Style" value={player.bowlingStyle} />
            <StatItem label="Matches" value={player.stats.matches} />
            <StatItem label="Runs" value={player.stats.runs} />
            <StatItem label="Wickets" value={player.stats.wickets} />
            <StatItem label="Strike Rate" value={player.stats.strikeRate} />
            <StatItem label="Economy" value={player.stats.economy} />
            <StatItem label="Country" value={player.nationality} />
          </div>
        </div>
      </div>
    </article>
  );
}

function StatItem({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null) return null;
  return (
    <div className="glass-panel flex flex-col gap-2 p-6 transition-all hover:bg-black/[0.02]">
      <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{label}</dt>
      <dd className="text-2xl font-black text-foreground">{value}</dd>
    </div>
  );
}
