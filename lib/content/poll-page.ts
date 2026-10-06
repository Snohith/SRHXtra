import { getPlayerInsight } from "@/lib/content/player-insights";
import { getPlayerSeasonPoll } from "@/lib/content/player-season-poll";
import {
  buildNomineeStatRows,
  getPlayerOfTheSeason,
  getSeasonPlayerStats,
} from "@/lib/content/player-season-stats";
import { getPlayerBySlug } from "@/lib/content/squad";

export interface PollNomineeView {
  playerSlug: string;
  name: string;
  role: string;
  image: string | null;
  imageAlt: string;
  reason: string;
  verdict: string | null;
  strengths: string[];
  statRows: { label: string; value: string }[];
  profileUrl: string;
}

export interface RunsRaceEntry {
  name: string;
  slug: string;
  runs: number;
  strikeRate: number;
  sixes: number;
}

export interface WicketsRaceEntry {
  name: string;
  slug: string;
  wickets: number;
  economy: string;
  best: string;
}

export interface PollPageData {
  pollSlug: string;
  title: string;
  description: string;
  updatedAt: string;
  nominees: PollNomineeView[];
  runsRace: RunsRaceEntry[];
  wicketsRace: WicketsRaceEntry[];
  maxRuns: number;
  maxWickets: number;
  winner: {
    slug: string;
    name: string;
    runs: number;
    strikeRate: number;
    average: number | null;
    fifties: number;
    highestScore: string | null;
    profileUrl: string;
  };
}

/**
 * Assembles everything the player-poll page needs from the verified
 * file-based sources. No hardcoded numbers here — every figure traces
 * back to player-season-stats.json, player-season-poll.json or squad.json.
 */
export function getPollPageData(): PollPageData {
  const poll = getPlayerSeasonPoll();

  const nominees: PollNomineeView[] = poll.nominees.map((nominee) => {
    const squadPlayer = getPlayerBySlug(nominee.playerSlug);
    const insight = getPlayerInsight(nominee.playerSlug);

    return {
      playerSlug: nominee.playerSlug,
      name: squadPlayer?.name ?? nominee.playerSlug,
      role: squadPlayer?.role ?? "SRH",
      image: squadPlayer?.image ?? null,
      imageAlt: squadPlayer?.imageAlt ?? squadPlayer?.name ?? nominee.playerSlug,
      reason: nominee.reason,
      verdict: insight?.verdict ?? null,
      strengths: insight ? [...insight.strengths] : [],
      statRows: buildNomineeStatRows(nominee.playerSlug),
      profileUrl: `/sunrisers-hyderabad/squad/${nominee.playerSlug}/`,
    };
  });

  const batters = getSeasonPlayerStats()
    .filter((player) => player.runs !== undefined)
    .sort((a, b) => (b.runs ?? 0) - (a.runs ?? 0))
    .slice(0, 4);

  const bowlers = getSeasonPlayerStats()
    .filter((player) => player.wickets !== undefined)
    .sort((a, b) => (b.wickets ?? 0) - (a.wickets ?? 0))
    .slice(0, 3);

  const winnerStat = getPlayerOfTheSeason();

  return {
    pollSlug: poll.id,
    title: poll.title,
    description: poll.description,
    updatedAt: poll.updatedAt,
    nominees,
    runsRace: batters.map((player) => ({
      name: player.name,
      slug: player.slug,
      runs: player.runs ?? 0,
      strikeRate: player.strikeRate ?? 0,
      sixes: player.sixes ?? 0,
    })),
    wicketsRace: bowlers.map((player) => ({
      name: player.name,
      slug: player.slug,
      wickets: player.wickets ?? 0,
      economy: player.economy ?? "—",
      best: player.bestSpell ?? "—",
    })),
    maxRuns: Math.max(...batters.map((player) => player.runs ?? 0), 1),
    maxWickets: Math.max(...bowlers.map((player) => player.wickets ?? 0), 1),
    winner: {
      slug: winnerStat.slug,
      name: winnerStat.name,
      runs: winnerStat.runs ?? 0,
      strikeRate: winnerStat.strikeRate ?? 0,
      average: winnerStat.average ?? null,
      fifties: winnerStat.fifties ?? 0,
      highestScore: winnerStat.highestScore ?? null,
      profileUrl: `/sunrisers-hyderabad/squad/${winnerStat.slug}/`,
    },
  };
}
