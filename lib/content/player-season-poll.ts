import fs from "node:fs";

import { resolveDataPath } from "@/lib/utils/paths";
import { getPlayerBySlug, type Player } from "@/lib/content/squad";
import { assertRequiredString } from "@/lib/content/validation";

export interface PlayerSeasonPollNominee {
  playerSlug: string;
  reason: string;
  player: Player;
}

export interface PlayerSeasonPoll {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  nominees: PlayerSeasonPollNominee[];
}

interface RawPlayerSeasonPoll {
  id?: string;
  title?: string;
  description?: string;
  updatedAt?: string;
  nominees?: Array<{
    playerSlug?: string;
    reason?: string;
  }>;
}

export function getPlayerSeasonPoll(): PlayerSeasonPoll {
  const filePath = resolveDataPath("player-season-poll.json");
  const poll = JSON.parse(fs.readFileSync(filePath, "utf8")) as RawPlayerSeasonPoll;

  const nominees = Array.isArray(poll.nominees)
    ? poll.nominees.map((nominee, index) => {
        const playerSlug = assertRequiredString(nominee.playerSlug, `nominees[${index}].playerSlug`, filePath);
        const player = getPlayerBySlug(playerSlug);

        if (!player) {
          throw new Error(`${filePath}: nominee "${playerSlug}" does not match a squad player`);
        }

        return {
          playerSlug,
          reason: assertRequiredString(nominee.reason, `nominees[${index}].reason`, filePath),
          player,
        };
      })
    : [];

  if (nominees.length === 0) {
    throw new Error(`${filePath}: poll must include at least one nominee`);
  }

  return {
    id: assertRequiredString(poll.id, "id", filePath),
    title: assertRequiredString(poll.title, "title", filePath),
    description: assertRequiredString(poll.description, "description", filePath),
    updatedAt: assertRequiredString(poll.updatedAt, "updatedAt", filePath),
    nominees,
  };
}
