import Link from "next/link";
import Image from "next/image";

import type { Player } from "@/lib/content/squad";
import { resolvePlayerImage } from "@/lib/content/images";
import { Badge } from "@/components/ui/Badge";

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const playerImage = resolvePlayerImage(player);

  return (
    <article className="glass-panel group overflow-hidden transition-all duration-500 hover:border-accent/30">
      <Link href={`/sunrisers-hyderabad/squad/${player.slug}/`} className="flex flex-col h-full">
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-strong sm:aspect-[4/5]">
          <Image
            alt={playerImage.alt}
            className="h-full w-full object-cover object-top transition-transform duration-1000 group-hover:scale-110"
            height={800}
            src={playerImage.src}
            width={600}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />
          {player.jerseyNumber ? (
            <span className="absolute left-4 top-4 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-black tracking-widest text-white backdrop-blur sm:left-6 sm:top-6">
              #{player.jerseyNumber}
            </span>
          ) : null}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
            {player.captain ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">Captain</Badge>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex flex-grow flex-col p-4 sm:p-7 lg:p-8">
          <h3 className="text-lg font-black uppercase tracking-tighter text-foreground transition-colors group-hover:text-accent sm:text-2xl">
            {player.name}
          </h3>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
            {[player.nationality, player.battingStyle].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-3 line-clamp-2 flex-grow text-sm font-medium leading-relaxed text-muted sm:mt-4 sm:line-clamp-3">
            {player.bio ?? "SRH squad member. We're still writing up this profile."}
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 sm:mt-8 sm:pt-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent sm:tracking-[0.3em]">Full Profile</span>
            <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center transition-all group-hover:border-accent group-hover:bg-accent group-hover:text-white">
              <span className="text-lg">→</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
