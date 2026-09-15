import playerSeasonStats from "@/content/data/player-season-stats.json";

/**
 * Single source of truth for SRH's IPL 2026 season aggregates.
 *
 * Both the Player of the Season reveal (`PlayerOfTheSeason`) and the season poll
 * (`PlayerSeasonPoll`) read from `content/data/player-season-stats.json` through the
 * helpers below. Never hardcode season totals inside a component: conflicting copies
 * of the same stat have already shipped once (606 vs 624 runs for Heinrich Klaasen).
 */

export interface SeasonPlayerStat {
  slug: string;
  name: string;
  primaryStat: "batting" | "bowling";
  matches: number;
  innings?: number;
  notOuts?: number;
  runs?: number;
  balls?: number;
  strikeRate?: number;
  average?: number;
  highestScore?: string;
  fifties?: number;
  hundreds?: number;
  sixes?: number;
  wickets?: number;
  bowlingAverage?: string;
  economy?: string;
  bestSpell?: string;
}

export interface SeasonStatCard {
  label: string;
  value: string;
  suffix?: string;
}

export interface SeasonStatRow {
  label: string;
  value: string;
}

export interface RunComparisonEntry {
  name: string;
  runs: number;
  sixes: number;
  sr: number;
  isWinner: boolean;
}

const PLAYERS = playerSeasonStats.players as SeasonPlayerStat[];

export function getSeasonPlayerStats(): SeasonPlayerStat[] {
  return PLAYERS;
}

export function getSeasonPlayerStat(nameOrSlug: string): SeasonPlayerStat | null {
  const normalized = nameOrSlug.trim().toLowerCase();

  return (
    PLAYERS.find((player) => player.slug === normalized)
    ?? PLAYERS.find((player) => player.name.trim().toLowerCase() === normalized)
    ?? null
  );
}

/** The leading run scorer — the season's Orange Cap holder and Player of the Season. */
export function getPlayerOfTheSeason(): SeasonPlayerStat {
  return PLAYERS.reduce((best, player) =>
    (player.runs ?? 0) > (best.runs ?? 0) ? player : best,
  );
}

/** Hero stat tiles for the Player of the Season reveal. */
export function buildSeasonHighlightCards(slug: string): SeasonStatCard[] {
  const player = getSeasonPlayerStat(slug);

  if (!player) {
    return [];
  }

  const cards: SeasonStatCard[] = [
    { label: "Total Runs", value: String(player.runs ?? 0) },
    { label: "Strike Rate", value: player.strikeRate !== undefined ? String(player.strikeRate) : "—" },
  ];

  if (player.average !== undefined) {
    cards.push({ label: "Batting Avg", value: player.average.toFixed(2) });
  }
  if (player.fifties !== undefined) {
    cards.push({ label: "Fifties", value: String(player.fifties) });
  }
  if (player.highestScore) {
    cards.push({ label: "High Score", value: player.highestScore });
  }

  const isTopRunScorer = player.slug === getPlayerOfTheSeason().slug;
  cards.push({
    label: "Orange Cap",
    value: isTopRunScorer ? "#1" : "—",
    suffix: isTopRunScorer ? "Holder" : undefined,
  });

  return cards;
}

/** Compact stat rows rendered on poll nominee cards. */
export function buildNomineeStatRows(nameOrSlug: string): SeasonStatRow[] {
  const player = getSeasonPlayerStat(nameOrSlug);

  if (!player) {
    return [];
  }

  if (player.primaryStat === "bowling") {
    const rows: SeasonStatRow[] = [{ label: "Matches", value: String(player.matches) }];

    if (player.wickets !== undefined) {
      rows.push({ label: "Wickets", value: String(player.wickets) });
    }
    if (player.bowlingAverage !== undefined) {
      rows.push({ label: "Average", value: player.bowlingAverage });
    }
    if (player.economy !== undefined) {
      rows.push({ label: "Economy", value: player.economy });
    }
    if (player.bestSpell !== undefined) {
      rows.push({ label: "Best spell", value: player.bestSpell });
    }
    if (player.runs !== undefined) {
      rows.push({ label: "Runs", value: String(player.runs) });
    }

    return rows;
  }

  const rows: SeasonStatRow[] = [
    { label: "Matches", value: String(player.matches) },
    { label: "Runs", value: String(player.runs ?? 0) },
    { label: "Strike rate", value: player.strikeRate !== undefined ? String(player.strikeRate) : "—" },
  ];

  if (player.highestScore) {
    rows.push({ label: "Highest score", value: player.highestScore });
  }

  if ((player.hundreds ?? 0) > 0) {
    rows.push({ label: "100s / 50s", value: `${player.hundreds} / ${player.fifties ?? 0}` });
  } else {
    rows.push({ label: "Fifties", value: String(player.fifties ?? 0) });
  }

  return rows;
}

/** Batting comparison bars — max values are derived so bars can never overflow. */
export function buildRunComparison(): RunComparisonEntry[] {
  const leader = getPlayerOfTheSeason();

  return PLAYERS.filter((player) => player.runs !== undefined).map((player) => ({
    name: player.name,
    runs: player.runs ?? 0,
    sixes: player.sixes ?? 0,
    sr: player.strikeRate ?? 0,
    isWinner: player.slug === leader.slug,
  }));
}