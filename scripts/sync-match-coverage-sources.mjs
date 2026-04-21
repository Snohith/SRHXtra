#!/usr/bin/env node

import { fetchJsonp, fetchText, logList, logSection, parseArgs, resolveProjectPath, slugify, stripTags, writeJsonFileIfChanged } from "./lib/sync-utils.mjs";

const SRH_TEAM_CODE = "SRH";
const COMPETITION_FEED_URL = "https://scores.iplt20.com/ipl/mc/competition.js";
const RESULTS_PAGE_URL = "https://www.iplt20.com/teams/sunrisers-hyderabad/results";
const FIXTURES_PAGE_URL = "https://www.iplt20.com/matches/fixtures";
const outputFilePath = resolveProjectPath("content", "data", "match-coverage-sources.json");

function selectCompetition(competitionData, seasonArg) {
  const competitions = Array.isArray(competitionData.competition) ? competitionData.competition : [];

  if (!competitions.length) {
    throw new Error("Competition feed did not include any competitions.");
  }

  if (seasonArg) {
    const selected = competitions.find((competition) => String(competition.CompetitionName).includes(String(seasonArg)));
    if (!selected) {
      throw new Error(`Could not find IPL competition for season ${seasonArg}.`);
    }
    return selected;
  }

  return [...competitions].sort((left, right) => Number(right.SeasonID) - Number(left.SeasonID))[0];
}

function parseReportMap(data) {
  const entries = Array.isArray(data) ? data : Array.isArray(data.matchlinks) ? data.matchlinks : [];
  return new Map(
    entries
      .filter((entry) => (entry?.MatchID || entry?.smId) && (entry?.Report || entry?.report))
      .map((entry) => [String(entry.MatchID ?? entry.smId), String(entry.Report ?? entry.report).trim()]),
  );
}

function normalizeMatch(entry, reportUrl) {
  const firstSummary = String(entry.FirstBattingSummary ?? "").trim();
  const secondSummary = String(entry.SecondBattingSummary ?? "").trim();
  const result = String(entry.Commentss ?? entry.Comments ?? "").replace(/\s+/g, " ").trim();

  return {
    id: `ipl-${entry.MatchDate?.slice(0, 4)}-${entry.MatchID}`,
    matchId: String(entry.MatchID),
    slug: slugify(`${entry.MatchOrder} ${entry.FirstBattingTeamCode} vs ${entry.SecondBattingTeamCode}`),
    matchOrder: String(entry.MatchOrder ?? "").trim(),
    date: String(entry.MatchDate ?? "").trim(),
    displayDate: String(entry.MatchDateNew ?? "").trim(),
    venue: `${String(entry.GroundName ?? "").trim()}, ${String(entry.city ?? "").trim()}`.replace(/,\s*$/, ""),
    opponent: entry.FirstBattingTeamCode === SRH_TEAM_CODE ? String(entry.SecondBattingTeamName ?? "").trim() : String(entry.FirstBattingTeamName ?? "").trim(),
    homeAway: String(entry.HomeTeamName ?? "").trim() === "Sunrisers Hyderabad" ? "home" : "away",
    toss: String(entry.TossDetails ?? "").trim() || null,
    result,
    scores: {
      firstInnings: firstSummary || null,
      secondInnings: secondSummary || null,
    },
    playerOfTheMatch: String(entry.MOM ?? "").trim() || null,
    officialReportUrl: reportUrl || null,
  };
}

function parseReportParagraphs(html) {
  return [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((entry) => stripTags(entry[1]))
    .map((entry) => entry.replace(/\s+/g, " ").trim())
    .filter((entry) => entry.length > 35)
    .filter((entry) => !entry.startsWith("A post shared by"))
    .slice(0, 12);
}

function validateMatches(matches) {
  const missingFields = [];

  for (const match of matches) {
    if (!match.matchId) {
      missingFields.push(`${match.slug} -> matchId`);
    }
    if (!match.date) {
      missingFields.push(`${match.slug} -> date`);
    }
    if (!match.result) {
      missingFields.push(`${match.slug} -> result`);
    }
    if (!match.officialReportUrl) {
      missingFields.push(`${match.slug} -> officialReportUrl`);
    }
  }

  if (missingFields.length > 0) {
    logSection("Missing match-coverage source fields");
    logList(" - ", missingFields);
    throw new Error("Match coverage sources are incomplete. Aborting write.");
  }
}

export async function syncMatchCoverageSources(options = {}) {
  const { dryRun = false, season } = options;

  logSection("Fetching official SRH completed-match source data");
  console.log(`[official-sync] Source: ${RESULTS_PAGE_URL}`);
  console.log(`[official-sync] Source: ${FIXTURES_PAGE_URL}`);

  const competitionData = await fetchJsonp(COMPETITION_FEED_URL);
  const selectedCompetition = selectCompetition(competitionData, season);
  const scheduleFeedUrl = `https://scores.iplt20.com/ipl/feeds/${selectedCompetition.CompetitionID}-matchschedule.js`;
  const statsMatchLinksFeedUrl = `https://scores.iplt20.com/ipl/feeds/stats/${String(selectedCompetition.CompetitionName).match(/(\d{4})/)?.[1] ?? season}-matchlinks.js`;
  console.log(`[official-sync] Source: ${scheduleFeedUrl}`);
  console.log(`[official-sync] Source: ${statsMatchLinksFeedUrl}`);

  const [scheduleData, matchLinksData] = await Promise.all([
    fetchJsonp(scheduleFeedUrl),
    fetchJsonp(statsMatchLinksFeedUrl),
  ]);

  const reportMap = parseReportMap(matchLinksData);
  const completedMatches = (Array.isArray(scheduleData.Matchsummary) ? scheduleData.Matchsummary : [])
    .filter((entry) => entry.MatchStatus === "Post")
    .filter((entry) => entry.FirstBattingTeamCode === SRH_TEAM_CODE || entry.SecondBattingTeamCode === SRH_TEAM_CODE)
    .map((entry) => normalizeMatch(entry, reportMap.get(String(entry.MatchID))));

  validateMatches(completedMatches);

  const enrichedMatches = await Promise.all(
    completedMatches.map(async (match) => {
      const reportHtml = await fetchText(match.officialReportUrl);
      return {
        ...match,
        reportSummaryParagraphs: parseReportParagraphs(reportHtml),
      };
    }),
  );

  const nextValue = {
    season: String(selectedCompetition.CompetitionName).match(/(\d{4})/)?.[1] ?? String(season ?? ""),
    updatedAt: new Date().toISOString(),
    sourcePriority: [RESULTS_PAGE_URL, FIXTURES_PAGE_URL, scheduleFeedUrl, statsMatchLinksFeedUrl],
    matches: enrichedMatches.sort((left, right) => left.date.localeCompare(right.date)),
  };

  return writeJsonFileIfChanged(outputFilePath, nextValue, {
    dryRun,
    label: "content/data/match-coverage-sources.json",
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));

  syncMatchCoverageSources(args).catch((error) => {
    console.error(`[official-sync] Match coverage source sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
