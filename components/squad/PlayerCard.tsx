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
      <Link href={`/squad/${player.slug}/`} className="flex flex-col h-full">
        <div className="relative aspect-[4/5] overflow-hidden bg-black/20">
          <Image
            alt={playerImage.alt}
            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
            height={800}
            src={playerImage.src}
            width={600}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{player.role}</Badge>
              {player.captain ? <Badge tone="neutral" className="border-white/10 bg-white/5">Captain</Badge> : null}
            </div>
          </div>
        </div>
        <div className="flex flex-col flex-grow p-8">
          <h3 className="text-2xl font-black uppercase tracking-tighter text-white transition-colors group-hover:text-accent">
            {player.name}
          </h3>
          <p className="mt-4 line-clamp-3 flex-grow text-sm font-medium leading-relaxed text-muted">
            {player.bio ?? "Official SRH roster member. Analysis currently being updated for the latest campaign."}
          </p>
          <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Full Profile</span>
            <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center transition-all group-hover:border-accent group-hover:bg-accent group-hover:text-black">
              <span className="text-lg">→</span>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
