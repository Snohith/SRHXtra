#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import {
  cleanString,
  decodeHtmlEntities,
  parseArgs,
  resolveProjectPath,
  writeJsonFileIfChanged,
  writeTextFileIfChanged,
} from "./lib/sync-utils.mjs";

const scheduleFilePath = resolveProjectPath("content", "data", "schedule.json");
const sourcesFilePath = resolveProjectPath("content", "data", "match-coverage-sources.json");
const galleryDirPath = resolveProjectPath("content", "gallery", "albums");
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

const OPPONENT_ALIASES = {
  "Royal Challengers Bengaluru": ["royal challengers bengaluru", "rcb"],
  "Kolkata Knight Riders": ["kolkata knight riders", "kkr"],
  "Lucknow Super Giants": ["lucknow super giants", "lsg"],
  "Punjab Kings": ["punjab kings", "pbks"],
  "Rajasthan Royals": ["rajasthan royals", "rr"],
  "Chennai Super Kings": ["chennai super kings", "csk"],
  "Delhi Capitals": ["delhi capitals", "dc"],
  "Mumbai Indians": ["mumbai indians", "mi"],
  "Gujarat Titans": ["gujarat titans", "gt"],
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readCoverageFiles() {
  if (!fs.existsSync(coverageDirPath)) {
    return [];
  }

  return fs
    .readdirSync(coverageDirPath)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const filePath = path.join(coverageDirPath, fileName);
      const parsed = matter(fs.readFileSync(filePath, "utf8"));
      return {
        filePath,
        data: parsed.data,
        content: parsed.content.trim(),
      };
    });
}

function readGalleryAlbums() {
  if (!fs.existsSync(galleryDirPath)) {
    return [];
  }

  return fs
    .readdirSync(galleryDirPath)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => JSON.parse(fs.readFileSync(path.join(galleryDirPath, fileName), "utf8")));
}

function normalizeText(value) {
  return cleanString(String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " "));
}

function extractMatchNumber(value) {
  const match = String(value ?? "").match(/\b(\d+)(?:st|nd|rd|th)?\s+match\b/i) ?? String(value ?? "").match(/\bmatch[-\s](\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function getUsefulParagraphs(match) {
  return (Array.isArray(match.reportSummaryParagraphs) ? match.reportSummaryParagraphs : [])
    .map((paragraph) => decodeHtmlEntities(paragraph))
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0)
    .filter((paragraph) => !/Updates ▶️|https?:\/\/|pic\.twitter|#TATAIPL|The full scorecard/i.test(paragraph));
}

function findMatchSource(draftFrontmatter, sources) {
  return (
    sources.matches.find((match) => match.slug === draftFrontmatter.slug)
    ?? sources.matches.find((match) => match.officialReportUrl === draftFrontmatter.sourceUrl)
    ?? null
  );
}

function findGalleryCover(match, fixture, albums) {
  const matchNumber = extractMatchNumber(match.matchOrder ?? fixture?.reportSlug ?? match.slug);
  const aliases = OPPONENT_ALIASES[match.opponent] ?? [match.opponent];
  const normalizedMatchOrder = normalizeText(match.matchOrder);

  return (
    albums.find((album) => {
      const haystack = normalizeText(`${album.title} ${album.description}`);
      const aliasMatch = aliases.some((alias) => haystack.includes(normalizeText(alias)));
      const albumMatchNumber = extractMatchNumber(album.title);
      const stageMatch = matchNumber === null && normalizedMatchOrder && haystack.includes(normalizedMatchOrder);
      return aliasMatch && (matchNumber === null ? stageMatch : albumMatchNumber === matchNumber);
    })
    ?? null
  );
}

function summarizeResult(result, opponent) {
  if (result.startsWith("Sunrisers Hyderabad Won")) {
    return `SRH beat ${opponent} ${result.replace(/^Sunrisers Hyderabad Won\s*/i, "").trim()}`.trim();
  }

  return `${opponent} beat SRH ${result.replace(new RegExp(`^${opponent}\\s+Won\\s*`, "i"), "").trim()}`.trim();
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

function detectPhaseSignals(paragraphs, phase) {
  const filters = phase === "first"
    ? [/powerplay/i, /partnership/i, /rebuild/i, /collapse/i, /total/i]
    : [/chasing/i, /required/i, /wicket/i, /partnership/i, /final over/i, /middle overs/i];

  const picked = [];

  for (const paragraph of paragraphs) {
    if (filters.some((pattern) => pattern.test(paragraph))) {
      picked.push(paragraph);
    }

    if (picked.length === 2) {
      break;
    }
  }

  return picked;
}

function extractNamedStat(paragraph) {
  const match = paragraph.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+).*?(\d+\*?\s*(?:off|from)\s*\d+|\d+\/\d+)/);
  if (!match) {
    return null;
  }

  return `${match[1]} (${match[2].replace(/\s+/g, " ")})`;
}

function paraphraseSignal(paragraph) {
  const stat = extractNamedStat(paragraph);

  if (/powerplay/i.test(paragraph)) {
    return stat
      ? `the powerplay was driven by ${stat}`
      : "the powerplay set the tone early";
  }

  if (/partnership/i.test(paragraph)) {
    const stand = paragraph.match(/(\d+)-run stand/i)?.[1];
    return stand
      ? `a ${stand}-run partnership reset the innings`
      : "a key stand rebuilt the innings";
  }

  if (/collapse|lost five wickets|double strike/i.test(paragraph)) {
    return "a burst of wickets changed the tempo sharply";
  }

  if (/run-out/i.test(paragraph)) {
    return "run-out pressure amplified the swing in momentum";
  }

  if (/final over|death/i.test(paragraph)) {
    return "the closing overs decided the margin";
  }

  if (/required|chasing/i.test(paragraph)) {
    return "the chase tightened once the required rate climbed";
  }

  if (/wicket/i.test(paragraph)) {
    return stat
      ? `${stat} arrived at a decisive stage`
      : "regular wickets prevented a settled phase";
  }

  return stat
    ? `${stat} was one of the defining individual contributions`
    : "the official notes point to one decisive phase shift here";
}

function buildContextParagraph(match) {
  const summary = summarizeResult(match.result, match.opponent);
  return `${summary}. The verified local source layer records ${match.scores.firstInnings} and ${match.scores.secondInnings} at ${match.venue} on ${match.displayDate}, with ${match.playerOfTheMatch ?? "the official player of the match"} shaping the result.`;
}

function buildTossParagraph(match) {
  if (!match.toss) {
    return "The local official-data layer does not currently confirm the toss decision, so this section should stay under review.";
  }

  const direction = /elected to (bat|field)/i.exec(match.toss)?.[1]?.toLowerCase();
  const action = direction ? ` and chose to ${direction}` : "";
  return `${match.toss}.${action ? ` That decision framed the early tempo of the match.` : ""}`;
}

function buildFirstInningsParagraph(match, paragraphs) {
  const signals = detectPhaseSignals(paragraphs, "first");

  if (signals.length === 0) {
    return `The first innings finished at ${match.scores.firstInnings}. The verified source confirms the scoreline, but the phase detail remains thin enough that this section should stay concise until a human editor cross-checks the scorecard.`;
  }

  const opener = paraphraseSignal(signals[0]);
  const closer = signals[1] ? paraphraseSignal(signals[1]) : null;

  return `The first innings ended at ${match.scores.firstInnings}. Verified notes suggest two main phases: ${opener}.${closer ? ` After that, ${closer}.` : ""}`;
}

function buildSecondInningsParagraph(match, paragraphs) {
  const signals = detectPhaseSignals(paragraphs, "second");

  if (signals.length === 0) {
    return `The chase closed at ${match.scores.secondInnings}. The result is verified, but the local notes do not yet support a stronger phase-by-phase retelling without manual review.`;
  }

  const opener = paraphraseSignal(signals[0]);
  const closer = signals[1] ? paraphraseSignal(signals[1]) : null;

  return `The second innings finished at ${match.scores.secondInnings}. The local source layer indicates that ${opener}.${closer ? ` The next major shift was that ${closer}.` : ""}`;
}

function buildTurningPoints(match, paragraphs) {
  const picks = paragraphs
    .filter((paragraph) => /powerplay|partnership|dismiss|wicket|run-out|collapse|death|final over|middle overs/i.test(paragraph))
    .slice(0, 4);

  if (picks.length === 0) {
    return ["- Human review is still needed to pin down the exact momentum swings from the scorecard."];
  }

  return picks.map((paragraph) => `- ${paraphraseSignal(paragraph)}.`);
}

function buildStandoutPerformers(match, paragraphs) {
  const picks = [];

  if (match.playerOfTheMatch) {
    picks.push(`- Official player of the match: ${match.playerOfTheMatch}.`);
  }

  for (const paragraph of paragraphs) {
    const stat = extractNamedStat(paragraph);
    if (stat) {
      picks.push(`- ${stat}.`);
    }

    if (picks.length === 4) {
      break;
    }
  }

  return picks.length > 0
    ? picks
    : ["- Add confirmed batting and bowling standouts from the official scorecard before publishing."];
}

function buildConclusion(match, publishable) {
  if (!publishable) {
    return "This draft is structurally stronger, but it should remain in review because the current local source layer still needs a final editorial pass before publication.";
  }

  return "This version is publish-ready on source support: the result, scores, venue, date, and core phase notes are all grounded in the verified local official-data layer. A final human read should still check tone and line edits, but the factual spine is in place.";
}

function serializeFrontmatterDate(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return cleanString(value);
}

function getPublishedTags(frontmatter, publishable) {
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.map(cleanString).filter(Boolean) : [];

  if (!publishable) {
    return tags;
  }

  const nextTags = tags.map((tag) => tag === "Match Report Draft" ? "Match Report" : tag);
  return [...new Set(nextTags)];
}

function getRequiredSupportGaps(match, usefulParagraphs) {
  const gaps = [];

  if (!match.result) gaps.push("missing result");
  if (!match.scores?.firstInnings) gaps.push("missing first-innings score");
  if (!match.scores?.secondInnings) gaps.push("missing second-innings score");
  if (!match.venue) gaps.push("missing venue");
  if (!match.date) gaps.push("missing date");
  if (!match.opponent) gaps.push("missing opponent");
  if (!match.officialReportUrl) gaps.push("missing official report URL");
  if (usefulParagraphs.length < 4) gaps.push("insufficient verified phase notes");

  return gaps;
}

function buildPolishedMarkdown(frontmatter, match, galleryAlbum, publishable, usefulParagraphs) {
  const fixtureTeams = getFixtureTeams(match);
  const title = cleanString(frontmatter.title) || `${match.opponent} Match Coverage Review`;
  const excerpt = publishable
    ? `${summarizeResult(match.result, match.opponent)}. Local official data confirms the scoreboard and the core match phases at ${match.venue}.`
    : cleanString(frontmatter.excerpt)
      || `${summarizeResult(match.result, match.opponent)}. Local official data confirms the scoreboard and the core match phases at ${match.venue}.`;
  const coverImage = cleanString(galleryAlbum?.coverImage) || cleanString(frontmatter.coverImage) || "/images/articles/match-clinical-chase.svg";
  const coverAlt = cleanString(galleryAlbum?.coverAlt) || cleanString(frontmatter.coverAlt) || `Match coverage visual for SRH vs ${match.opponent}`;
  const updatedAt = new Date().toISOString();
  const publishedAt = serializeFrontmatterDate(frontmatter.publishedAt);
  const tags = getPublishedTags(frontmatter, publishable);

  return `---
slug: ${frontmatter.slug}
title: ${title}
excerpt: ${excerpt}
publishedAt: ${publishedAt}
updatedAt: ${updatedAt}
author: ${frontmatter.author}
category: ${frontmatter.category}
tags:
${tags.map((tag) => `  - ${tag}`).join("\n")}
matchDate: "${match.date}"
venue: "${match.venue}"
homeTeam: "${fixtureTeams.homeTeam}"
awayTeam: "${fixtureTeams.awayTeam}"
result: "${match.result}"
coverImage: ${coverImage}
coverAlt: ${coverAlt}
featured: ${frontmatter.featured ? "true" : "false"}
seoTitle: ${cleanString(frontmatter.seoTitle) || title}
seoDescription: ${cleanString(frontmatter.seoDescription) || excerpt}
ogImage: ${cleanString(galleryAlbum?.coverImage) || cleanString(frontmatter.ogImage) || coverImage}
relatedSlugs: [${(Array.isArray(frontmatter.relatedSlugs) ? frontmatter.relatedSlugs : []).map((slug) => `"${slug}"`).join(", ")}]
draft: ${publishable ? "false" : "true"}
editorialStatus: ${publishable ? "verified" : "draft-review"}
sourceName: ${cleanString(frontmatter.sourceName) || "IPL T20"}
sourceUrl: ${match.officialReportUrl}
---
# Match context

${buildContextParagraph(match)}

## Toss and team direction

${buildTossParagraph(match)}

## First innings summary

${buildFirstInningsParagraph(match, usefulParagraphs)}

## Second innings summary

${buildSecondInningsParagraph(match, usefulParagraphs)}

## Tactical turning points

${buildTurningPoints(match, usefulParagraphs).join("\n")}

## Standout performers

${buildStandoutPerformers(match, usefulParagraphs).join("\n")}

## Neutral closing takeaway

${buildConclusion(match, publishable)}
`;
}

async function main(options = {}) {
  const schedule = readJson(scheduleFilePath);
  const sources = readJson(sourcesFilePath);
  const galleryAlbums = readGalleryAlbums();
  const coverageFiles = readCoverageFiles();
  const draftFiles = coverageFiles.filter(
    (entry) => entry.data?.draft === true || entry.data?.editorialStatus === "draft-review",
  );

  const slugFilter = options.slug ? String(options.slug) : null;
  const candidates = slugFilter
    ? draftFiles.filter((entry) => entry.data?.slug === slugFilter)
    : draftFiles;

  console.log(`[polish-match-coverage] Draft reports found: ${draftFiles.length}`);
  console.log(`[polish-match-coverage] Reports selected: ${candidates.length}`);

  if (candidates.length === 0) {
    console.log("[polish-match-coverage] No draft-review reports needed polishing.");
    return;
  }

  let coverageChanged = false;
  let scheduleChanged = false;

  for (const entry of candidates) {
    if (entry.data?.draft === false && entry.data?.editorialStatus === "verified" && !options.allowOverwriteVerified) {
      console.log(`[polish-match-coverage] Skipping verified report without override: ${entry.data.slug}`);
      continue;
    }

    const match = findMatchSource(entry.data, sources);

    if (!match) {
      console.log(`[polish-match-coverage] Missing verified source match for ${entry.data.slug}`);
      continue;
    }

    const usefulParagraphs = getUsefulParagraphs(match);
    const supportGaps = getRequiredSupportGaps(match, usefulParagraphs);
    const publishable = supportGaps.length === 0;
    const fixture = schedule.fixtures.find((candidate) => candidate.id === match.id);
    const galleryAlbum = findGalleryCover(match, fixture, galleryAlbums);

    console.log(`[polish-match-coverage] ${entry.data.slug}: ${publishable ? "publish-ready" : "kept as draft-review"}`);
    if (supportGaps.length > 0) {
      console.log(`[polish-match-coverage] ${entry.data.slug}: support gaps -> ${supportGaps.join(", ")}`);
    }
    if (galleryAlbum?.coverImage) {
      console.log(`[polish-match-coverage] ${entry.data.slug}: using remote cover image from ${galleryAlbum.sourceUrl ?? galleryAlbum.coverImage}`);
    }

    const nextMarkdown = buildPolishedMarkdown(entry.data, match, galleryAlbum, publishable, usefulParagraphs);
    coverageChanged = writeTextFileIfChanged(entry.filePath, nextMarkdown, {
      dryRun: options.dryRun,
      label: path.relative(resolveProjectPath(), entry.filePath),
    }) || coverageChanged;

    if (publishable && fixture && !fixture.reportSlug) {
      fixture.reportSlug = entry.data.slug;
      scheduleChanged = true;
    }
  }

  if (scheduleChanged) {
    schedule.updatedAt = new Date().toISOString();
    writeJsonFileIfChanged(scheduleFilePath, schedule, {
      dryRun: options.dryRun,
      label: "content/data/schedule.json",
    });
  }

  if (!coverageChanged && !scheduleChanged) {
    console.log("[polish-match-coverage] No file changes were required.");
  }
}

const args = parseArgs(process.argv.slice(2));

main(args).catch((error) => {
  console.error(`[polish-match-coverage] Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
