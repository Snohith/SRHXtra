#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { cleanString, parseArgs, resolveProjectPath, writeTextFileIfChanged } from "./lib/sync-utils.mjs";

const scheduleFilePath = resolveProjectPath("content", "data", "schedule.json");
const sourcesFilePath = resolveProjectPath("content", "data", "match-coverage-sources.json");
const coverageDirPath = resolveProjectPath("content", "match-coverage");
const teamCodes = new Map([
  ["Chennai Super Kings", "CSK"],
  ["Delhi Capitals", "DC"],
  ["Gujarat Titans", "GT"],
  ["Kolkata Knight Riders", "KKR"],
  ["Lucknow Super Giants", "LSG"],
  ["Mumbai Indians", "MI"],
  ["Punjab Kings", "PBKS"],
  ["Rajasthan Royals", "RR"],
  ["Royal Challengers Bengaluru", "RCB"],
  ["Sunrisers Hyderabad", "SRH"],
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getExistingCoverageMap() {
  if (!fs.existsSync(coverageDirPath)) {
    return new Map();
  }

  return new Map(
    fs
      .readdirSync(coverageDirPath)
      .filter((fileName) => fileName.endsWith(".md"))
      .map((fileName) => {
        const filePath = path.join(coverageDirPath, fileName);
        const parsed = matter(fs.readFileSync(filePath, "utf8"));
        const slug = String(parsed.data.slug ?? fileName.replace(/\.md$/, ""));
        return [slug, { filePath, data: parsed.data }];
      }),
  );
}

function splitResult(result, homeAway, opponent) {
  const normalized = cleanString(result);
  const srhPrefix = "Sunrisers Hyderabad Won";

  if (normalized.startsWith(srhPrefix)) {
    return {
      outcome: "win",
      summary: `SRH beat ${opponent} ${normalized.slice(srhPrefix.length).trimStart().replace(/^by\s+/i, "by ")}`,
    };
  }

  return {
    outcome: "loss",
    summary: homeAway === "home"
      ? `${opponent} beat SRH ${normalized.replace(new RegExp(`^${opponent}\\s+Won\\s+`, "i"), "")}`
      : `${opponent} beat SRH ${normalized.replace(new RegExp(`^${opponent}\\s+Won\\s+`, "i"), "")}`,
  };
}

function getTeamCode(teamName) {
  return teamCodes.get(cleanString(teamName)) ?? cleanString(teamName);
}

function getFixtureTeams(match) {
  const opponentCode = getTeamCode(match.opponent);

  return match.homeAway === "home"
    ? { homeTeam: "SRH", awayTeam: opponentCode }
    : { homeTeam: opponentCode, awayTeam: "SRH" };
}

function getHeadline(match) {
  const { outcome } = splitResult(match.result, match.homeAway, match.opponent);

  if (outcome === "win") {
    return match.homeAway === "home"
      ? `SRH Take Control Against ${match.opponent} at ${match.venue.split(",")[0]}`
      : `SRH Clinch an Away Result Against ${match.opponent}`;
  }

  return match.homeAway === "home"
    ? `${match.opponent} Edge SRH After Hyderabad Recovery`
    : `SRH Fall Short Against ${match.opponent} on the Road`;
}

function getExcerpt(match) {
  const scoreline = `${match.scores.firstInnings} and ${match.scores.secondInnings}`;
  return `${splitResult(match.result, match.homeAway, match.opponent).summary}. Verified draft built from the official IPL result and report notes (${scoreline}).`;
}

function getContextParagraph(match) {
  return `${splitResult(match.result, match.homeAway, match.opponent).summary}. The official score summary lists ${match.scores.firstInnings} and ${match.scores.secondInnings}, with ${match.playerOfTheMatch ?? "the official report"} shaping the result at ${match.venue} on ${match.displayDate}.`;
}

function getPhaseParagraph(match, phase) {
  const paragraphs = Array.isArray(match.reportSummaryParagraphs) ? match.reportSummaryParagraphs : [];
  const filtered = paragraphs.filter((paragraph) => !/https?:\/\/|Updates ▶️|The full scorecard/i.test(paragraph));
  const midpoint = Math.ceil(filtered.length / 2);
  const selected = phase === "first" ? filtered.slice(0, Math.max(3, midpoint)) : filtered.slice(Math.max(2, midpoint - 1));
  const text = selected.slice(0, 4).join(" ");
  return text || "Official source detail for this phase needs human review before publication.";
}

function getTurningPoints(match) {
  const paragraphs = Array.isArray(match.reportSummaryParagraphs) ? match.reportSummaryParagraphs : [];
  const candidates = paragraphs.filter((paragraph) =>
    /powerplay|partnership|dismiss|wicket|collapse|final over|middle overs|death/i.test(paragraph),
  );

  const picks = candidates.slice(0, 3);
  if (picks.length === 0) {
    return [
      "- Confirm the key momentum swings from the official scorecard before publishing.",
    ];
  }

  return picks.map((paragraph) => `- ${paragraph}`);
}

function getStandoutPerformers(match) {
  const performers = [];
  if (match.playerOfTheMatch) {
    performers.push(`- Official player of the match: ${match.playerOfTheMatch}.`);
  }

  const paragraphs = Array.isArray(match.reportSummaryParagraphs) ? match.reportSummaryParagraphs : [];
  const named = paragraphs
    .filter((paragraph) => /\b(off|for|not out|unbeaten|\*)\b/i.test(paragraph))
    .filter((paragraph) => !/Updates ▶️|https?:\/\//.test(paragraph))
    .slice(0, 2);

  for (const paragraph of named) {
    performers.push(`- ${paragraph}`);
  }

  return performers.length > 0 ? performers : ["- Add verified performer notes from the official score summary during review."];
}

function buildDraftMarkdown(match) {
  const fixtureTeams = getFixtureTeams(match);

  return `---
slug: ${match.slug}
title: ${getHeadline(match)}
excerpt: ${getExcerpt(match)}
publishedAt: ${new Date(`${match.date}T18:00:00.000Z`).toISOString()}
updatedAt: ${new Date().toISOString()}
author: SRHXtra Match Desk
category: Match Coverage
tags:
  - Match Report Draft
  - ${match.opponent}
  - IPL ${match.date.slice(0, 4)}
matchDate: "${match.date}"
venue: "${match.venue}"
homeTeam: "${fixtureTeams.homeTeam}"
awayTeam: "${fixtureTeams.awayTeam}"
result: "${match.result}"
coverImage: /images/articles/match-clinical-chase.svg
coverAlt: Editorial match graphic draft for SRH vs ${match.opponent}
featured: false
seoTitle: ${getHeadline(match)}
seoDescription: ${getExcerpt(match)}
ogImage: /images/articles/match-clinical-chase.svg
relatedSlugs: []
draft: true
editorialStatus: draft-review
sourceName: IPL T20
sourceUrl: ${match.officialReportUrl}
---
# Match context

${getContextParagraph(match)}

## Verified match facts

- Opponent: ${match.opponent}
- Venue: ${match.venue}
- Date: ${match.displayDate}
- Result: ${match.result}
- Score summary: ${match.scores.firstInnings}; ${match.scores.secondInnings}
- Toss: ${match.toss ?? "Not verified in local source layer"}

## First innings summary

${getPhaseParagraph(match, "first")}

## Second innings summary

${getPhaseParagraph(match, "second")}

## Tactical turning points

${getTurningPoints(match).join("\n")}

## Standout performers

${getStandoutPerformers(match).join("\n")}

## Neutral conclusion

This is a draft-review report generated from verified official source data already synced into the repo. A human editor should tighten the phrasing, confirm any tactical framing against the scorecard, and remove any line that feels more interpretive than the evidence supports.
`;
}

function getMatchesNeedingDrafts(schedule, sources, existingCoverage) {
  const sourceById = new Map(sources.matches.map((match) => [match.id, match]));

  return schedule.fixtures
    .filter((fixture) => fixture.status === "completed")
    .filter((fixture) => !fixture.reportSlug || !existingCoverage.has(fixture.reportSlug) || existingCoverage.get(fixture.reportSlug)?.data?.draft === true)
    .map((fixture) => sourceById.get(fixture.id))
    .filter(Boolean)
    .filter((match) => !existingCoverage.has(match.slug));
}

async function main(options = {}) {
  const { dryRun = false } = options;
  const schedule = readJson(scheduleFilePath);
  const sources = readJson(sourcesFilePath);
  const existingCoverage = getExistingCoverageMap();
  const matches = getMatchesNeedingDrafts(schedule, sources, existingCoverage);

  console.log(`[draft-generator] Completed matches in source layer: ${sources.matches.length}`);
  console.log(`[draft-generator] Existing local match-coverage files: ${existingCoverage.size}`);
  console.log(`[draft-generator] Drafts needed: ${matches.length}`);

  let changed = false;

  for (const match of matches) {
    const filePath = path.join(coverageDirPath, `${match.slug}.md`);
    changed = writeTextFileIfChanged(filePath, buildDraftMarkdown(match), {
      dryRun,
      label: `content/match-coverage/${match.slug}.md`,
    }) || changed;
  }

  if (!changed) {
    console.log("[draft-generator] No new draft files were needed.");
  }
}

const args = parseArgs(process.argv.slice(2));

main(args).catch((error) => {
  console.error(`[draft-generator] Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
