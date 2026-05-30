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
    <aside className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Squad spotlight</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{player.name}</h2>
        </div>
        <Badge tone="neutral">{player.role}</Badge>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-[132px_1fr] sm:items-start">
        <div className="image-frame aspect-[1/1.08] rounded-[1.25rem] border border-border">
          <Image
            alt={playerImage.alt}
            className="h-full w-full object-cover"
            height={800}
            src={playerImage.src}
            width={800}
          />
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {player.captain ? <Badge tone="accent">Captain</Badge> : null}
            {player.wicketkeeper ? <Badge tone="success">WK</Badge> : null}
          </div>
          <p className="text-sm leading-7 text-muted">
            {player.bio ?? "Full profile details and tactical analysis for this squad member are being processed."}
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-muted">
            <span>{player.nationality}</span>
            <span>
              {player.stats.matches === null || player.stats.matches === undefined
                ? "Stats pending"
                : `${player.stats.matches} ${player.stats.matches === 1 ? "IPL match" : "IPL matches"}`}
            </span>
          </div>
          <Button href={`/squad/${player.slug}/`} size="sm" variant="secondary">
            Open profile
          </Button>
        </div>
      </div>
    </aside>
  );
}
