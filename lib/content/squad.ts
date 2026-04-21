import fs from "node:fs";

import { resolveDataPath } from "@/lib/utils/paths";
import {
  assertEditorialStatus,
  assertRequiredString,
  type EditorialStatus,
} from "@/lib/content/validation";

export interface PlayerStats {
  matches?: number | null;
  runs?: number | null;
  wickets?: number | null;
  strikeRate?: number | null;
  economy?: number | null;
}

export interface Player {
  slug: string;
  name: string;
  fullName: string;
  role: string;
  nationality: string;
  battingStyle?: string | null;
  bowlingStyle?: string | null;
  jerseyNumber?: number | null;
  captain?: boolean;
  wicketkeeper?: boolean;
  image: string;
  imageAlt: string;
  bio?: string | null;
  stats: PlayerStats;
  socials?: Record<string, string>;
  editorialStatus?: EditorialStatus;
}

export interface Squad {
  season: string;
  updatedAt: string;
  editorialStatus?: EditorialStatus;
  players: Player[];
}

export function getSquad(): Squad {
  const fileContent = fs.readFileSync(resolveDataPath("squad.json"), "utf8");
  const squad = JSON.parse(fileContent) as Squad;
  const filePath = resolveDataPath("squad.json");

  if (!Array.isArray(squad.players) || squad.players.length === 0) {
    throw new Error(`Squad must include at least one player: ${filePath}`);
  }

  return {
    season: assertRequiredString(squad.season, "season", filePath),
    updatedAt: assertRequiredString(squad.updatedAt, "updatedAt", filePath),
    editorialStatus: assertEditorialStatus(squad.editorialStatus, filePath),
    players: squad.players.map((player, index) => ({
      slug: assertRequiredString(player.slug, `players[${index}].slug`, filePath),
      name: assertRequiredString(player.name, `players[${index}].name`, filePath),
      fullName: assertRequiredString(player.fullName, `players[${index}].fullName`, filePath),
      role: assertRequiredString(player.role, `players[${index}].role`, filePath),
      nationality: assertRequiredString(
        player.nationality,
        `players[${index}].nationality`,
        filePath,
      ),
      battingStyle: player.battingStyle ? String(player.battingStyle) : null,
      bowlingStyle: player.bowlingStyle ? String(player.bowlingStyle) : null,
      jerseyNumber: typeof player.jerseyNumber === "number" ? player.jerseyNumber : null,
      captain: Boolean(player.captain),
      wicketkeeper: Boolean(player.wicketkeeper),
      image: assertRequiredString(player.image, `players[${index}].image`, filePath),
      imageAlt: assertRequiredString(player.imageAlt, `players[${index}].imageAlt`, filePath),
      bio: player.bio ? String(player.bio) : null,
      stats: {
        matches: typeof player.stats?.matches === "number" ? player.stats.matches : null,
        runs: typeof player.stats?.runs === "number" ? player.stats.runs : null,
        wickets: typeof player.stats?.wickets === "number" ? player.stats.wickets : null,
        strikeRate: typeof player.stats?.strikeRate === "number" ? player.stats.strikeRate : null,
        economy: typeof player.stats?.economy === "number" ? player.stats.economy : null,
      },
      socials: player.socials,
      editorialStatus: assertEditorialStatus(player.editorialStatus, filePath),
    })),
  };
}

export function getPlayerBySlug(slug: string) {
  return getSquad().players.find((player) => player.slug === slug) ?? null;
}

export function getPlayerSlugs() {
  return getSquad().players.map((player) => player.slug);
}

export function getRelatedPlayers(slug: string, limit = 4) {
  const currentPlayer = getPlayerBySlug(slug);

  if (!currentPlayer) {
    return [];
  }

  return getSquad().players
    .filter((player) => player.slug !== slug)
    .sort((left, right) => {
      const leftScore = Number(left.role === currentPlayer.role);
      const rightScore = Number(right.role === currentPlayer.role);
      return rightScore - leftScore;
    })
    .slice(0, limit);
}

export function getSquadSpotlightPlayer() {
  const squad = getSquad();

  return (
    squad.players.find((player) => player.captain)
    ?? squad.players.find((player) => player.wicketkeeper)
    ?? squad.players[0]
    ?? null
  );
}
