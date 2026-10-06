import Image from "next/image";

import type { Player } from "@/lib/content/squad";
import { resolvePlayerImage } from "@/lib/content/images";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface SquadSpotlightProps {
  player: Player | null;
}

export function SquadSpotlight({ player }: SquadSpotlightProps) {
  if (!player) {
    return null;
  }

  const playerImage = resolvePlayerImage(player);

  return (
    <aside className="panel min-w-0 p-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Squad spotlight</p>
          <h2 className="mt-2 min-w-0 w-full whitespace-normal break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">{player.name}</h2>
        </div>
        <Badge tone="neutral">{player.role}</Badge>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[132px_1fr] sm:items-start">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.25rem] border border-border bg-surface-strong sm:aspect-[1/1.08]">
          <Image
            alt={playerImage.alt}
            className="object-cover object-top"
            fill
            sizes="(max-width: 640px) 100vw, 132px"
            src={playerImage.src}
          />
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            {player.captain ? <Badge tone="accent">Captain</Badge> : null}
            {player.wicketkeeper ? <Badge tone="success">WK</Badge> : null}
          </div>
          <p className="line-clamp-5 min-w-0 w-full whitespace-normal break-words text-sm leading-6 text-muted">
            {player.bio ?? "We haven't filled in this profile yet. Check back soon."}
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-muted">
            <span>{player.nationality}</span>
            <span>
              {player.stats.matches === null || player.stats.matches === undefined
                ? "Stats pending"
                : `${player.stats.matches} ${player.stats.matches === 1 ? "IPL match" : "IPL matches"}`}
            </span>
          </div>
          <Button href={`/sunrisers-hyderabad/squad/${player.slug}/`} size="sm" variant="secondary">
            Open profile
          </Button>
        </div>
      </div>
    </aside>
  );
}
