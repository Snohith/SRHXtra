/**
 * Player profile data for /squad/[playerSlug].
 *
 * Stats, portraits, flags, and social links come from the official SRH player
 * feed (backend-srh.doableworks.in), fetched 17 Oct 2026 and vendored into
 * data/players.json so builds stay deterministic. The feed's roster differs
 * from the curated list in lib/squad.ts (see the squad page notes), so
 * profiles are matched to squad members by name: feed-backed players get full
 * career stats, while everyone else gets a clean basic profile rather than
 * invented numbers.
 *
 * Portraits and flags are © Sun TV Network / SunRisers Hyderabad; they are
 * referenced by URL only and never re-hosted.
 */

import feed from "@/data/players.json";

import {
  countryInfo,
  playerSlug,
  roleInfo,
  SQUAD,
  type CountryInfo,
  type SquadPlayer,
} from "@/lib/squad";

/**
 * Career figures as published by the feed; the keys vary by player type and
 * unpublished numbers arrive as "--" placeholders, so every key is typed
 * loosely and normalized before display.
 */
export interface FeedStats {
  matches?: number | string;
  runs?: number | string;
  strike_rate?: number | string;
  best_score?: number | string;
  hundreds_fifties?: number | string;
  fours_sixes?: number | string;
  wickets?: number | string;
  economy?: number | string;
  best_figures?: number | string;
  four_wicket_hauls?: number | string;
  catches?: number | string;
}

export interface PlayerSocial {
  instagram?: string;
  twitter?: string;
}

interface FeedPlayer {
  id: string;
  name: string;
  role: string;
  jersey_number?: string;
  nationality: string;
  country_code: string;
  badges?: string[];
  stats?: FeedStats;
  images?: { card?: string; portrait?: string; flag?: string };
  social?: PlayerSocial;
}

const FEED_PLAYERS = feed.players as unknown as FeedPlayer[];

/** ISO timestamp of the vendored feed snapshot (data/players.json). */
export const FEED_FETCHED_AT = feed.fetched_at_utc;

/* ---------------------------------------------------------------------- */
/* Name matching — the feed and the curated squad differ in four players   */
/* and in how compound names are written ("Nitish Reddy" vs "Nitish Kumar  */
/* Reddy"), so match on token sets: a match is when one name's tokens are  */
/* a subset of the other's.                                                */
/* ---------------------------------------------------------------------- */

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function feedFor(name: string): FeedPlayer | undefined {
  const want = nameTokens(name);
  return FEED_PLAYERS.find((candidate) => {
    const have = new Set(nameTokens(candidate.name));
    return (
      want.every((token) => have.has(token)) ||
      [...have].every((token) => want.includes(token))
    );
  });
}

/* ---------------------------------------------------------------------- */
/* Stat tiles — label/value pairs rendered as a definition list.           */
/* ---------------------------------------------------------------------- */

export interface StatTile {
  label: string;
  value: string;
}

/* The feed mixes numbers ("162.47"), formatted strings ("106*", "1/9"), and
   "--" placeholders for figures it has not published, so every value is
   normalized and anything malformed is dropped rather than shown. */

function statNumber(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return undefined;
}

function statScore(value: number | string | undefined): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && /^\d+\*?$/.test(value)) return value;
  return undefined;
}

function statPair(value: number | string | undefined): string | undefined {
  return typeof value === "string" && /^\d+\/\d+$/.test(value)
    ? value
    : undefined;
}

function battingTiles(stats: FeedStats): StatTile[] {
  const tiles: StatTile[] = [];

  const runs = statNumber(stats.runs);
  if (runs !== undefined) {
    tiles.push({ label: "Runs", value: runs.toLocaleString("en-IN") });
  }
  const strikeRate = statNumber(stats.strike_rate);
  if (strikeRate !== undefined) {
    tiles.push({ label: "Strike rate", value: strikeRate.toFixed(2) });
  }
  const best = statScore(stats.best_score);
  if (best !== undefined) {
    tiles.push({ label: "Best score", value: best });
  }
  const milestones = statPair(stats.hundreds_fifties);
  if (milestones !== undefined) {
    tiles.push({ label: "100s / 50s", value: milestones.replace("/", " / ") });
  } else {
    const boundaries = statPair(stats.fours_sixes);
    if (boundaries !== undefined) {
      tiles.push({ label: "4s / 6s", value: boundaries.replace("/", " / ") });
    }
  }
  return tiles;
}

function bowlingTiles(stats: FeedStats): StatTile[] {
  const tiles: StatTile[] = [];

  const wickets = statNumber(stats.wickets);
  if (wickets !== undefined) {
    tiles.push({ label: "Wickets", value: String(wickets) });
  }
  const economy = statNumber(stats.economy);
  if (economy !== undefined) {
    tiles.push({ label: "Economy", value: economy.toFixed(2) });
  }
  const figures = statPair(stats.best_figures);
  if (figures !== undefined) {
    tiles.push({ label: "Best figures", value: figures });
  }
  const hauls = statNumber(stats.four_wicket_hauls);
  if (hauls !== undefined) {
    tiles.push({ label: "4-wicket hauls", value: String(hauls) });
  }
  const catches = statNumber(stats.catches);
  if (catches !== undefined) {
    tiles.push({ label: "Catches", value: String(catches) });
  }
  return tiles;
}

/* ---------------------------------------------------------------------- */
/* Profiles                                                                */
/* ---------------------------------------------------------------------- */

export type BadgeKind = "captain" | "vice" | "intl" | "tag";

export function badgeKind(badge: string): BadgeKind {
  if (badge === "Captain") return "captain";
  if (badge === "Vice Captain") return "vice";
  if (badge === "International") return "intl";
  return "tag";
}

export interface ProfileNeighbour {
  slug: string;
  player: SquadPlayer;
  /** Feed card image (2:3 kit portrait), when the feed covers the player. */
  avatar?: string;
}

export interface PlayerProfile {
  slug: string;
  player: SquadPlayer;
  /** Singular role label ("Bowler") — matches the squad page groups. */
  roleLabel: string;
  country: CountryInfo;
  badges: string[];
  jerseyNumber?: number;
  matches?: number;
  batting: StatTile[];
  bowling: StatTile[];
  portrait?: string;
  cardImage?: string;
  flag?: string;
  social: PlayerSocial;
  /** Squad-order neighbours for the profile pager. */
  prev?: ProfileNeighbour;
  next?: ProfileNeighbour;
}

function buildProfile(player: SquadPlayer, index: number): PlayerProfile {
  const feedPlayer = feedFor(player.name);
  const stats = feedPlayer?.stats ?? {};
  const feedNumber = feedPlayer?.jersey_number
    ? Number.parseInt(feedPlayer.jersey_number, 10)
    : Number.NaN;
  const neighbour = (offset: number): ProfileNeighbour | undefined => {
    const other = SQUAD[index + offset];
    if (!other) return undefined;
    return {
      slug: playerSlug(other.name),
      player: other,
      avatar: feedFor(other.name)?.images?.card,
    };
  };

  return {
    slug: playerSlug(player.name),
    player,
    roleLabel: roleInfo(player.role).singular,
    country: countryInfo(player.country),
    badges: Array.from(
      new Set([
        ...(feedPlayer?.badges ?? []),
        ...(player.captain ? ["Captain"] : []),
        ...(player.tag ? [player.tag] : []),
      ]),
    ),
    jerseyNumber:
      player.number ?? (Number.isFinite(feedNumber) ? feedNumber : undefined),
    matches: statNumber(stats.matches),
    batting: battingTiles(stats),
    bowling: bowlingTiles(stats),
    portrait: feedPlayer?.images?.portrait,
    cardImage: feedPlayer?.images?.card,
    flag: feedPlayer?.images?.flag,
    social: feedPlayer?.social ?? {},
    prev: neighbour(-1),
    next: neighbour(1),
  };
}

const PROFILES: PlayerProfile[] = SQUAD.map(buildProfile);

export function getAllProfiles(): PlayerProfile[] {
  return PROFILES;
}

export function getProfile(slug: string): PlayerProfile | undefined {
  return PROFILES.find((profile) => profile.slug === slug);
}
