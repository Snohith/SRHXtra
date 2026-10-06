import Image from "next/image";

import type { Player } from "@/lib/content/squad";
import type { SeasonPlayerStat } from "@/lib/content/player-season-stats";
import { getPlayerInsight } from "@/lib/content/player-insights";
import { resolvePlayerImage } from "@/lib/content/images";
import { Badge } from "@/components/ui/Badge";

interface PlayerProfileProps {
  player: Player;
  season?: SeasonPlayerStat | null;
  /** e.g. "#1 most runs for SRH in 2026" — computed from season aggregates. */
  seasonRanks?: string[];
}

export function PlayerProfile({ player, season, seasonRanks = [] }: PlayerProfileProps) {
  const playerImage = resolvePlayerImage(player);
  const insight = getPlayerInsight(player.slug);
  const isOverseas = player.nationality !== "Indian";

  return (
    <article className="flex flex-col gap-12">
      {/* Hero — player wall */}
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-[#0d0d0d] text-white shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 85% at 88% 8%, rgba(255,109,0,0.4) 0%, rgba(255,109,0,0) 60%), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px)",
          }}
        />
        {player.jerseyNumber ? (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 right-4 select-none text-[9rem] font-black leading-none tracking-tighter text-white/[0.07] sm:text-[13rem]"
          >
            {player.jerseyNumber}
          </p>
        ) : null}
        <div className="relative z-10 grid gap-8 p-6 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-[1.5rem] border border-white/10 shadow-premium">
            <Image
              alt={playerImage.alt}
              className="aspect-[4/5] w-full object-cover"
              height={1000}
              src={playerImage.src}
              width={800}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {player.captain ? (
                <Badge tone="neutral" className="border-none bg-white font-black text-black">
                  Captain
                </Badge>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
              {[player.role, isOverseas ? "Overseas" : "Domestic", player.nationality]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
              {player.name}
            </h1>
            {insight ? (
              <p className="mt-5 border-l-2 border-[#ff6d00] pl-4 text-base font-medium leading-relaxed text-white/80 sm:text-lg">
                {insight.verdict}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              {player.battingStyle ? (
                <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
                  Bats: {player.battingStyle}
                </span>
              ) : null}
              {player.bowlingStyle ? (
                <span className="rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">
                  Bowls: {player.bowlingStyle}
                </span>
              ) : null}
              {player.jerseyNumber ? (
                <span className="rounded-full border border-[#ff6d00]/50 bg-[#ff6d00]/15 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-[#ff9a3d]">
                  Squad No. {player.jerseyNumber}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* IPL 2026 report card */}
      {season ? (
        <section>
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
                By the numbers
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                IPL 2026 report card
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-black/[0.05] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
              {season.matches} games
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <SeasonTile label="Matches" value={String(season.matches)} />
            {season.runs !== undefined ? (
              <SeasonTile label="Runs" value={String(season.runs)} accent />
            ) : null}
            {season.strikeRate !== undefined ? (
              <SeasonTile label="Strike rate" value={String(season.strikeRate)} />
            ) : null}
            {season.highestScore ? <SeasonTile label="Highest" value={season.highestScore} /> : null}
            {season.fifties !== undefined || season.hundreds !== undefined ? (
              <SeasonTile
                label="100s / 50s"
                value={`${season.hundreds ?? 0} / ${season.fifties ?? 0}`}
              />
            ) : null}
            {season.sixes !== undefined ? (
              <SeasonTile label="Sixes" value={String(season.sixes)} accent />
            ) : null}
            {season.wickets !== undefined ? (
              <SeasonTile label="Wickets" value={String(season.wickets)} accent />
            ) : null}
            {season.economy !== undefined ? (
              <SeasonTile label="Economy" value={season.economy} />
            ) : null}
            {season.bestSpell ? <SeasonTile label="Best spell" value={season.bestSpell} /> : null}
            {season.bowlingAverage !== undefined ? (
              <SeasonTile label="Bowling avg" value={season.bowlingAverage} />
            ) : null}
            {season.average !== undefined ? (
              <SeasonTile label="Batting avg" value={season.average.toFixed(2)} />
            ) : null}
          </div>
          {seasonRanks.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {seasonRanks.map((rank) => (
                <span
                  key={rank}
                  className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-accent"
                >
                  {rank}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <section>
          <div className="mb-5 border-b border-border pb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
              Career snapshot
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
              The role in one glance
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SeasonTile label="IPL matches" value={String(player.stats.matches ?? "—")} accent />
            <SeasonTile label="Batting" value={player.battingStyle ?? "—"} />
            <SeasonTile label="Bowling" value={player.bowlingStyle ?? "—"} />
            <SeasonTile label="Nationality" value={player.nationality} />
          </div>
        </section>
      )}

      {/* Scout report */}
      {insight ? (
        <section>
          <div className="mb-5 border-b border-border pb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
              Scout report
            </p>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
              Why he matters
            </h2>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {insight.strengths.map((strength, index) => (
              <li key={strength} className="glass-panel flex min-w-0 gap-4 p-5 sm:p-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff6d00] text-sm font-black text-white">
                  {index + 1}
                </span>
                <p className="min-w-0 break-words text-sm font-medium leading-relaxed text-foreground">{strength}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Official dossier */}
      <section>
        <div className="mb-5 border-b border-border pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
            Official dossier
          </p>
          <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
            The story so far
          </h2>
        </div>
        <p className="max-w-4xl text-lg leading-relaxed text-muted sm:text-xl">
          {player.bio ?? "SRH squad member. We're still writing up this profile."}
        </p>
      </section>
    </article>
  );
}

function SeasonTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="glass-panel flex min-w-0 flex-col gap-1.5 p-4 sm:p-5">
      <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{label}</dt>
      <dd className={`break-words text-xl font-black sm:text-2xl ${accent ? "text-accent" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}
