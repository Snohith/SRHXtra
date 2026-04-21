#!/usr/bin/env node

import {
  fetchJsonp,
  logList,
  logSection,
  parseArgs,
  resolveProjectPath,
  writeJsonFileIfChanged,
} from "./lib/sync-utils.mjs";

const COMPETITION_FEED_URL = "https://scores.iplt20.com/ipl/mc/competition.js";
const POINTS_TABLE_PAGE_URL = "https://www.iplt20.com/points-table/men";
const pointsTableFilePath = resolveProjectPath("content", "data", "points-table.json");

function selectCompetition(competitionData, seasonArg) {
  const competitions = Array.isArray(competitionData.competition) ? competitionData.competition : [];

  if (!competitions.length) {
    throw new Error("Competition feed did not include any competitions.");
  }

  if (seasonArg) {
    const normalizedSeason = String(seasonArg).trim();
    const selected = competitions.find((competition) => String(competition.CompetitionName).includes(normalizedSeason));

    if (!selected) {
      throw new Error(`Could not find a competition for season ${normalizedSeason}.`);
    }

    return selected;
  }

  return [...competitions].sort((left, right) => Number(right.SeasonID) - Number(left.SeasonID))[0];
}

function normalizeRecentForm(value) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeRow(entry) {
  return {
    position: Number(entry.OrderNo),
    teamCode: String(entry.TeamCode ?? "").trim(),
    team: String(entry.TeamName ?? "").trim(),
    matches: Number(entry.Matches ?? 0),
    wins: Number(entry.Wins ?? 0),
    losses: Number(entry.Loss ?? 0),
    noResult: Number(entry.NoResult ?? 0),
    tied: Number(entry.Tied ?? 0),
    points: Number(entry.Points ?? 0),
    netRunRate: String(entry.NetRunRate ?? "").trim(),
    for: String(entry.ForTeams ?? "").trim(),
    against: String(entry.AgainstTeam ?? "").trim(),
    recentForm: normalizeRecentForm(entry.Performance),
    sourceTeamLogo: String(entry.TeamLogo ?? "").trim() || null,
  };
}

function validateRows(rows) {
  const missingFields = [];

  for (const row of rows) {
    if (!row.position) {
      missingFields.push(`${row.team || "unknown team"} -> position`);
    }
    if (!row.teamCode) {
      missingFields.push(`${row.team || "unknown team"} -> teamCode`);
    }
    if (!row.team) {
      missingFields.push(`${row.teamCode || "unknown"} -> team`);
    }
    if (Number.isNaN(row.matches)) {
      missingFields.push(`${row.teamCode} -> matches`);
    }
    if (Number.isNaN(row.points)) {
      missingFields.push(`${row.teamCode} -> points`);
    }
    if (!row.netRunRate) {
      missingFields.push(`${row.teamCode} -> netRunRate`);
    }
  }

  if (missingFields.length > 0) {
    logSection("Missing points-table fields");
    logList(" - ", missingFields);
    throw new Error("Points table feed was incomplete. Aborting write.");
  }
}

export async function syncPointsTable(options = {}) {
  const { dryRun = false, season } = options;

  logSection("Fetching official IPL points table");
  console.log(`[official-sync] Source: ${POINTS_TABLE_PAGE_URL}`);

  const competitionData = await fetchJsonp(COMPETITION_FEED_URL);
  const selectedCompetition = selectCompetition(competitionData, season);
  const seasonLabel = String(selectedCompetition.CompetitionName).match(/(\d{4})/)?.[1] ?? String(season ?? "");
  const standingsFeedUrl = `https://scores.iplt20.com/ipl/feeds/stats/${selectedCompetition.CompetitionID}-groupstandings.js`;
  console.log(`[official-sync] Source: ${standingsFeedUrl}`);

  const standingsData = await fetchJsonp(standingsFeedUrl, "ongroupstandings");
  const rows = Array.isArray(standingsData.points) ? standingsData.points.map(normalizeRow) : [];

  if (rows.length === 0) {
    throw new Error("Official points table feed returned no rows.");
  }

  validateRows(rows);

  const nextTable = {
    season: seasonLabel,
    updatedAt: new Date().toISOString(),
    sourcePriority: [POINTS_TABLE_PAGE_URL, standingsFeedUrl],
    standings: rows.sort((left, right) => left.position - right.position),
  };

  return writeJsonFileIfChanged(pointsTableFilePath, nextTable, {
    dryRun,
    label: "content/data/points-table.json",
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));

  syncPointsTable(args).catch((error) => {
    console.error(`[official-sync] Points table sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
