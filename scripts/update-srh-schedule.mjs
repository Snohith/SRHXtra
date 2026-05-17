#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const scheduleFilePath = path.join(projectRoot, "content", "data", "schedule.json");
const matchCoverageDir = path.join(projectRoot, "content", "match-coverage");
const matchPreviewsDir = path.join(projectRoot, "content", "match-previews");

const SRH = {
  code: "SRH",
  name: "Sunrisers Hyderabad",
};

const teamCodeByName = {
  "Chennai Super Kings": "CSK",
  "Delhi Capitals": "DC",
  "Gujarat Titans": "GT",
  "Kolkata Knight Riders": "KKR",
  "Lucknow Super Giants": "LSG",
  "Mumbai Indians": "MI",
  "Punjab Kings": "PBKS",
  "Rajasthan Royals": "RR",
  "Royal Challengers Bengaluru": "RCB",
  "Sunrisers Hyderabad": "SRH",
};

const officialPages = [
  "https://www.iplt20.com/teams/sunrisers-hyderabad/schedule",
  "https://www.iplt20.com/teams/sunrisers-hyderabad/results",
  "https://www.iplt20.com/matches/fixtures",
];

const officialCompetitionFeedUrls = [
  "https://scores.iplt20.com/ipl/mc/competition.js",
  "https://www.iplt20.com/ipl/mc/competition.js",
];

function parseArgs(argv) {
  const args = {
    dryRun: false,
    season: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--season" && argv[index + 1]) {
      args.season = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--season=")) {
      args.season = arg.split("=")[1];
    }
  }

  return args;
}

function logSection(title) {
  console.log(`\n[SRH schedule updater] ${title}`);
}

function logList(prefix, entries) {
  for (const entry of entries) {
    console.log(`${prefix}${entry}`);
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "SRHXtra schedule updater/1.0 (+https://github.com/)",
      accept: "*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new Error("Empty response body");
  }

  return text;
}

async function fetchFirstSuccessfulText(urls, label) {
  const attempts = [];

  for (const url of urls) {
    try {
      const text = await fetchText(url);
      return { text, url, attempts };
    } catch (error) {
      attempts.push(`${url} -> ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`Unable to fetch ${label}.\n${attempts.join("\n")}`);
}

function parseJsonp(payload, callbackName) {
  const trimmed = payload.trim().replace(/^\uFEFF/, "");
  const matcher = new RegExp(`^${callbackName}\\((([\\s\\S])*?)\\);?$`);
  const match = trimmed.match(matcher);

  if (!match?.[1]) {
    throw new Error(`Unexpected JSONP payload for ${callbackName}`);
  }

  return JSON.parse(match[1]);
}

function cleanString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCompetitionName(value) {
  return cleanString(value)
    .replace(/\bTata\b/g, "TATA")
    .replace(/\bIpl\b/g, "IPL");
}

function formatTime(value, timezone) {
  const time = cleanString(value);

  if (!time) {
    return "";
  }

  if (timezone === "Asia/Kolkata" && !time.endsWith("IST")) {
    return `${time} IST`;
  }

  return time;
}

function buildVenue(groundName, city) {
  const ground = cleanString(groundName);
  const venueCity = cleanString(city);

  if (!ground) {
    return "";
  }

  if (!venueCity) {
    return ground;
  }

  if (ground.toLowerCase().includes(venueCity.toLowerCase())) {
    return ground;
  }

  return `${ground}, ${venueCity}`;
}

function normalizeResult(value) {
  const cleaned = cleanString(value);
  return cleaned || undefined;
}

function getLocalMatchCoverageSlugs() {
  if (!existsSync(matchCoverageDir)) {
    return new Set();
  }

  return new Set(
    readdirSync(matchCoverageDir)
      .filter((fileName) => fileName.endsWith(".md"))
      .map((fileName) => fileName.replace(/\.md$/, "")),
  );
}

function readFrontmatterValue(frontmatter, field) {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*["']?([^"'\n]+)["']?\\s*$`, "m"));
  return cleanString(match?.[1]);
}

function getLocalMatchPreviews() {
  if (!existsSync(matchPreviewsDir)) {
    return [];
  }

  return readdirSync(matchPreviewsDir)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const fileContent = readFileSync(path.join(matchPreviewsDir, fileName), "utf8");
      const frontmatter = fileContent.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";

      return {
        slug: readFrontmatterValue(frontmatter, "slug") || fileName.replace(/\.md$/, ""),
        matchDate: readFrontmatterValue(frontmatter, "matchDate").replace(/^["']|["']$/g, ""),
        homeTeam: readFrontmatterValue(frontmatter, "homeTeam").replace(/^["']|["']$/g, ""),
        awayTeam: readFrontmatterValue(frontmatter, "awayTeam").replace(/^["']|["']$/g, ""),
      };
    })
    .filter((preview) => preview.slug && preview.matchDate && preview.homeTeam && preview.awayTeam);
}

function getInferredReportSlug(match, homeTeamName, awayTeamName, localMatchCoverageSlugs) {
  const matchOrder = cleanString(match.MatchOrder);
  const matchNumber = matchOrder.match(/\d+/)?.[0];

  if (!matchNumber) {
    return null;
  }

  const homeTeamCode = teamCodeByName[homeTeamName] ?? slugify(homeTeamName);
  const awayTeamCode = teamCodeByName[awayTeamName] ?? slugify(awayTeamName);
  const candidates = [
    `match-${matchNumber}-${homeTeamCode}-vs-${awayTeamCode}-report`,
    `match-${matchNumber}-${homeTeamCode}-vs-${awayTeamCode}`,
    `match-${matchNumber}-${SRH.code}-vs-${homeTeamName === SRH.name ? awayTeamCode : homeTeamCode}-report`,
    `match-${matchNumber}-${SRH.code}-vs-${homeTeamName === SRH.name ? awayTeamCode : homeTeamCode}`,
  ].map((value) => value.toLowerCase());

  return candidates.find((slug) => localMatchCoverageSlugs.has(slug)) ?? null;
}

function getInferredPreviewSlug(matchDate, homeTeamCode, awayTeamCode, localMatchPreviews) {
  return (
    localMatchPreviews.find(
      (preview) =>
        preview.matchDate === matchDate
        && preview.homeTeam === homeTeamCode
        && preview.awayTeam === awayTeamCode,
    )?.slug ?? null
  );
}

function readExistingSchedule() {
  if (!existsSync(scheduleFilePath)) {
    return null;
  }

  return JSON.parse(readFileSync(scheduleFilePath, "utf8"));
}

function getExistingFixtureMap(existingSchedule) {
  if (!existingSchedule?.fixtures || !Array.isArray(existingSchedule.fixtures)) {
    return new Map();
  }

  return new Map(
    existingSchedule.fixtures.map((fixture) => {
      const matchIdMatch = String(fixture.id ?? "").match(/(\d+)$/);
      const key = matchIdMatch ? Number(matchIdMatch[1]) : String(fixture.id);
      return [key, fixture];
    }),
  );
}

function selectCompetition(competitionData, seasonArg) {
  const competitions = Array.isArray(competitionData.competition) ? competitionData.competition : [];
  const divisions = Array.isArray(competitionData.division) ? competitionData.division : [];
  const seasonNameById = new Map(
    divisions.map((division) => [Number(division.SeasonID), cleanString(division.SeasonName)]),
  );

  if (!competitions.length) {
    throw new Error("Competition feed did not include any competitions.");
  }

  if (seasonArg) {
    const seasonValue = String(seasonArg).trim();
    const selected = competitions.find(
      (competition) =>
        String(seasonNameById.get(Number(competition.SeasonID)) ?? "") === seasonValue
        || String(competition.CompetitionName).includes(seasonValue),
    );

    if (!selected) {
      throw new Error(`Could not find IPL competition for season "${seasonValue}".`);
    }

    return {
      ...selected,
      SeasonName: seasonNameById.get(Number(selected.SeasonID)) ?? "",
    };
  }

  const selected = [...competitions].sort((left, right) => Number(right.SeasonID) - Number(left.SeasonID))[0];

  return {
    ...selected,
    SeasonName: seasonNameById.get(Number(selected.SeasonID)) ?? "",
  };
}

function buildScheduleFeedUrls(competition) {
  const fileName = String(competition.CodingType).toLowerCase() === "t20lite"
    ? `${competition.CompetitionID}-matchschedule.js`
    : `${competition.CompetitionID}-matchSchedule.js`;

  return [
    `https://scores.iplt20.com/ipl/feeds/${fileName}`,
    competition.feedsource ? `${competition.feedsource}/${fileName}` : null,
  ].filter(Boolean);
}

function buildMatchLinksFeedUrls(seasonName) {
  return [
    `https://scores.iplt20.com/ipl/feeds/stats/${seasonName}-matchlinks.js`,
    `https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats/${seasonName}-matchlinks.js`,
  ];
}

function isSrhFixture(match) {
  const homeTeamName = cleanString(match.HomeTeamName);
  const awayTeamName = cleanString(match.AwayTeamName);
  const firstTeamCode = cleanString(match.FirstBattingTeamCode);
  const secondTeamCode = cleanString(match.SecondBattingTeamCode);

  return homeTeamName === SRH.name
    || awayTeamName === SRH.name
    || firstTeamCode === SRH.code
    || secondTeamCode === SRH.code;
}

function mergePreferredValue(preferredValue, existingValue) {
  if (preferredValue === undefined || preferredValue === null || preferredValue === "") {
    return existingValue ?? preferredValue;
  }

  return preferredValue;
}

function normalizeFixture(match, context) {
  const {
    seasonName,
    competitionName,
    existingFixtureMap,
    localMatchCoverageSlugs,
    localMatchPreviews,
    matchLinksById,
  } = context;

  const homeTeamName = cleanString(match.HomeTeamName);
  const awayTeamName = cleanString(match.AwayTeamName);
  const existingFixture = existingFixtureMap.get(Number(match.MatchID)) ?? null;

  if (![homeTeamName, awayTeamName].includes(SRH.name)) {
    throw new Error(`Tried to normalize a non-SRH match: ${cleanString(match.MatchName)}`);
  }

  const homeAway = homeTeamName === SRH.name ? "home" : "away";
  const opponent = homeAway === "home" ? awayTeamName : homeTeamName;
  const opponentCode = teamCodeByName[opponent] ?? slugify(opponent);
  const homeTeam = teamCodeByName[homeTeamName] ?? slugify(homeTeamName).toUpperCase();
  const awayTeam = teamCodeByName[awayTeamName] ?? slugify(awayTeamName).toUpperCase();
  const officialStatus = cleanString(match.MatchStatus);
  const status = officialStatus === "Post" ? "completed" : "upcoming";
  const matchDate = cleanString(match.MatchDate);

  const fixture = {
    id: `ipl-${seasonName}-${match.MatchID}`,
    slug: slugify(`ipl-${seasonName}-match-${match.MatchID}-${SRH.code}-vs-${opponentCode}`),
    competition: competitionName,
    opponent,
    homeTeam,
    awayTeam,
    date: matchDate,
    time: formatTime(match.MatchTime, cleanString(match.timezone1)),
    venue: buildVenue(match.GroundName, match.city),
    homeAway,
    status,
  };

  const preservationNotes = [];
  const missingFields = [];

  if (status === "completed") {
    const result = mergePreferredValue(
      normalizeResult(match.Comments || match.Commentss),
      existingFixture?.result,
    );

    if (result) {
      fixture.result = result;
      if (!normalizeResult(match.Comments || match.Commentss) && existingFixture?.result) {
        preservationNotes.push("preserved existing result because the official feed was blank");
      }
    }
  }

  const inferredReportSlug = getInferredReportSlug(
    match,
    homeTeamName,
    awayTeamName,
    localMatchCoverageSlugs,
  );
  const inferredPreviewSlug = getInferredPreviewSlug(matchDate, homeTeam, awayTeam, localMatchPreviews);

  if (existingFixture?.reportSlug || inferredReportSlug) {
    fixture.reportSlug = existingFixture?.reportSlug ?? inferredReportSlug;
    if (!existingFixture?.reportSlug && inferredReportSlug) {
      preservationNotes.push(`linked local reportSlug "${inferredReportSlug}"`);
    }
  }

  if (existingFixture?.previewSlug || inferredPreviewSlug) {
    fixture.previewSlug = existingFixture?.previewSlug ?? inferredPreviewSlug;
    if (!existingFixture?.previewSlug && inferredPreviewSlug) {
      preservationNotes.push(`linked local previewSlug "${inferredPreviewSlug}"`);
    }
  }

  if (officialStatus && !["Post", "UpComing"].includes(officialStatus)) {
    fixture.notes = `Official IPL status: ${officialStatus}`;
  }

  const coreFields = ["competition", "opponent", "homeTeam", "awayTeam", "date", "time", "venue"];
  for (const field of coreFields) {
    if (!fixture[field]) {
      const preservedValue = cleanString(existingFixture?.[field]);
      if (preservedValue) {
        fixture[field] = preservedValue;
        preservationNotes.push(`preserved existing ${field} because the official feed was blank`);
      }
    }
  }

  if (status === "completed" && !fixture.result) {
    missingFields.push("result");
  }

  for (const field of ["id", "slug", "competition", "opponent", "homeTeam", "awayTeam", "date", "time", "venue", "homeAway", "status"]) {
    if (!fixture[field]) {
      missingFields.push(field);
    }
  }

  if (fixture.reportSlug && !localMatchCoverageSlugs.has(fixture.reportSlug)) {
    preservationNotes.push(`reportSlug "${fixture.reportSlug}" does not match a local match-coverage file`);
  }

  return {
    fixture,
    matchId: Number(match.MatchID),
    officialStatus,
    officialReportUrl: matchLinksById.get(Number(match.MatchID))?.report ?? null,
    missingFields,
    preservationNotes,
  };
}

function compareFixtures(left, right) {
  const leftDateTime = cleanString(left.MATCH_COMMENCE_START_DATE)
    || `${cleanString(left.MatchDate)} ${cleanString(left.MatchTime)}`;
  const rightDateTime = cleanString(right.MATCH_COMMENCE_START_DATE)
    || `${cleanString(right.MatchDate)} ${cleanString(right.MatchTime)}`;

  return new Date(`${leftDateTime.replace(" ", "T")}+05:30`).getTime()
    - new Date(`${rightDateTime.replace(" ", "T")}+05:30`).getTime();
}

function buildComparableSchedule(schedule) {
  if (!schedule) {
    return null;
  }

  return {
    season: schedule.season,
    editorialStatus: schedule.editorialStatus ?? null,
    fixtures: Array.isArray(schedule.fixtures)
      ? schedule.fixtures.map((fixture) => ({
          id: fixture.id,
          slug: fixture.slug,
          competition: fixture.competition,
          opponent: fixture.opponent,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          date: fixture.date,
          time: fixture.time,
          venue: fixture.venue,
          homeAway: fixture.homeAway,
          status: fixture.status,
          result: fixture.result ?? null,
          previewSlug: fixture.previewSlug ?? null,
          reportSlug: fixture.reportSlug ?? null,
          notes: fixture.notes ?? null,
          editorialStatus: fixture.editorialStatus ?? null,
        }))
      : [],
  };
}

function summarizeChanges(previousSchedule, nextSchedule) {
  if (!previousSchedule) {
    return {
      added: nextSchedule.fixtures.map((fixture) => fixture.id),
      removed: [],
      changed: [],
    };
  }

  const previousFixtures = new Map(previousSchedule.fixtures.map((fixture) => [fixture.id, fixture]));
  const nextFixtures = new Map(nextSchedule.fixtures.map((fixture) => [fixture.id, fixture]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, nextFixture] of nextFixtures) {
    const previousFixture = previousFixtures.get(id);
    if (!previousFixture) {
      added.push(id);
      continue;
    }

    const fields = [];
    for (const field of Object.keys(nextFixture)) {
      const previousValue = previousFixture[field] ?? null;
      const nextValue = nextFixture[field] ?? null;
      if (!isDeepStrictEqual(previousValue, nextValue)) {
        fields.push(field);
      }
    }

    for (const field of Object.keys(previousFixture)) {
      if (!(field in nextFixture)) {
        fields.push(field);
      }
    }

    if (fields.length) {
      changed.push(`${id} -> ${fields.join(", ")}`);
    }
  }

  for (const id of previousFixtures.keys()) {
    if (!nextFixtures.has(id)) {
      removed.push(id);
    }
  }

  return { added, removed, changed };
}

function validateSchedule(schedule) {
  const errors = [];
  const ids = new Set();
  const slugs = new Set();

  if (!cleanString(schedule.season)) {
    errors.push("Top-level season is missing.");
  }

  if (!Array.isArray(schedule.fixtures) || schedule.fixtures.length === 0) {
    errors.push("Schedule must contain at least one fixture.");
    return errors;
  }

  schedule.fixtures.forEach((fixture, index) => {
    const prefix = `fixtures[${index}]`;

    for (const field of ["id", "slug", "competition", "opponent", "homeTeam", "awayTeam", "date", "time", "venue"]) {
      if (!cleanString(fixture[field])) {
        errors.push(`${prefix}.${field} is missing.`);
      }
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanString(fixture.date))) {
      errors.push(`${prefix}.date must use YYYY-MM-DD.`);
    }

    if (!/^\d{2}:\d{2}(?: IST)?$/.test(cleanString(fixture.time))) {
      errors.push(`${prefix}.time must use HH:MM or HH:MM IST.`);
    }

    if (!["home", "away"].includes(fixture.homeAway)) {
      errors.push(`${prefix}.homeAway must be "home" or "away".`);
    }

    if (!["upcoming", "completed"].includes(fixture.status)) {
      errors.push(`${prefix}.status must be "upcoming" or "completed".`);
    }

    if (fixture.status === "completed" && !cleanString(fixture.result)) {
      errors.push(`${prefix}.result is required for completed fixtures.`);
    }

    if (ids.has(fixture.id)) {
      errors.push(`${prefix}.id must be unique. Duplicate: ${fixture.id}`);
    }
    ids.add(fixture.id);

    if (slugs.has(fixture.slug)) {
      errors.push(`${prefix}.slug must be unique. Duplicate: ${fixture.slug}`);
    }
    slugs.add(fixture.slug);
  });

  return errors;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  logSection("Using official IPL pages as the primary source family");
  logList("  - ", officialPages);

  const existingSchedule = readExistingSchedule();
  const existingFixtureMap = getExistingFixtureMap(existingSchedule);
  const localMatchCoverageSlugs = getLocalMatchCoverageSlugs();
  const localMatchPreviews = getLocalMatchPreviews();

  const competitionFeedResponse = await fetchFirstSuccessfulText(
    officialCompetitionFeedUrls,
    "official competition feed",
  );
  const competitionFeed = parseJsonp(competitionFeedResponse.text, "oncomptetion");
  const competition = selectCompetition(competitionFeed, args.season);
  const seasonName = cleanString(competition.SeasonName);
  const competitionName = normalizeCompetitionName(competition.CompetitionName);

  logSection(`Selected season ${seasonName} from ${competitionFeedResponse.url}`);

  const scheduleFeedResponse = await fetchFirstSuccessfulText(
    buildScheduleFeedUrls(competition),
    "official schedule feed",
  );
  const scheduleFeed = parseJsonp(scheduleFeedResponse.text, "MatchSchedule");

  let matchLinksResponse = null;
  let matchLinksById = new Map();

  try {
    matchLinksResponse = await fetchFirstSuccessfulText(
      buildMatchLinksFeedUrls(seasonName),
      "official match-links feed",
    );
    const matchLinksFeed = parseJsonp(matchLinksResponse.text, "onMatchLinks");
    matchLinksById = new Map(
      (Array.isArray(matchLinksFeed) ? matchLinksFeed : []).map((entry) => [Number(entry.smId), entry]),
    );
  } catch (error) {
    logSection("Official match-links feed unavailable");
    console.log(`  ${error instanceof Error ? error.message : String(error)}`);
    console.log("  The updater will continue without official report-link metadata.");
  }

  logSection("Resolved official machine-readable feeds");
  console.log(`  schedule feed: ${scheduleFeedResponse.url}`);
  console.log(`  match-links feed: ${matchLinksResponse?.url ?? "not available"}`);

  const srhMatches = (Array.isArray(scheduleFeed.Matchsummary) ? scheduleFeed.Matchsummary : [])
    .filter(isSrhFixture)
    .sort(compareFixtures);

  if (!srhMatches.length) {
    throw new Error(`No SRH fixtures were found in the official ${seasonName} schedule feed.`);
  }

  const normalizationResults = srhMatches.map((match) =>
    normalizeFixture(match, {
      seasonName,
      competitionName,
      existingFixtureMap,
      localMatchCoverageSlugs,
      localMatchPreviews,
      matchLinksById,
    }),
  );

  const missingFieldLogs = normalizationResults
    .filter((entry) => entry.missingFields.length > 0)
    .map((entry) => `${entry.fixture.id}: ${entry.missingFields.join(", ")}`);
  const preservationLogs = normalizationResults
    .flatMap((entry) => entry.preservationNotes.map((note) => `${entry.fixture.id}: ${note}`));
  const officialReportLogs = normalizationResults
    .filter((entry) => entry.officialReportUrl)
    .map((entry) => `${entry.fixture.id}: ${entry.officialReportUrl}`);

  const nextComparableSchedule = {
    season: seasonName,
    fixtures: normalizationResults.map((entry) => entry.fixture),
  };

  const validationErrors = validateSchedule(nextComparableSchedule);

  if (missingFieldLogs.length > 0) {
    logSection("Missing fields detected");
    logList("  - ", missingFieldLogs);
  }

  if (preservationLogs.length > 0) {
    logSection("Preserved existing local values");
    logList("  - ", preservationLogs);
  }

  if (validationErrors.length > 0) {
    logSection("Validation failed. Existing data will be kept.");
    logList("  - ", validationErrors);
    process.exitCode = 1;
    return;
  }

  const previousComparableSchedule = buildComparableSchedule(existingSchedule);
  const nextComparableNormalized = buildComparableSchedule(nextComparableSchedule);
  const changed = !isDeepStrictEqual(previousComparableSchedule, nextComparableNormalized);

  logSection("Normalization summary");
  console.log(`  SRH fixtures found: ${normalizationResults.length}`);
  console.log(`  completed fixtures: ${normalizationResults.filter((entry) => entry.fixture.status === "completed").length}`);
  console.log(`  upcoming fixtures: ${normalizationResults.filter((entry) => entry.fixture.status === "upcoming").length}`);
  console.log(`  local reportSlug values preserved: ${normalizationResults.filter((entry) => entry.fixture.reportSlug).length}`);
  console.log(`  local previewSlug values preserved: ${normalizationResults.filter((entry) => entry.fixture.previewSlug).length}`);
  console.log(`  official IPL report URLs available: ${officialReportLogs.length}`);

  if (officialReportLogs.length > 0) {
    logSection("Official IPL report links located");
    logList("  - ", officialReportLogs);
  }

  if (!changed) {
    logSection("No schedule data changes detected");
    console.log("  content/data/schedule.json was not rewritten.");
    return;
  }

  const nextSchedule = {
    season: seasonName,
    updatedAt: new Date().toISOString(),
    fixtures: normalizationResults.map((entry) => entry.fixture),
  };

  const changeSummary = summarizeChanges(
    previousComparableSchedule,
    buildComparableSchedule(nextSchedule),
  );

  logSection("Detected changes");
  console.log(`  added fixtures: ${changeSummary.added.length}`);
  console.log(`  removed fixtures: ${changeSummary.removed.length}`);
  console.log(`  changed fixtures: ${changeSummary.changed.length}`);

  if (changeSummary.added.length > 0) {
    logList("  + ", changeSummary.added);
  }

  if (changeSummary.removed.length > 0) {
    logList("  - ", changeSummary.removed);
  }

  if (changeSummary.changed.length > 0) {
    logList("  * ", changeSummary.changed);
  }

  if (args.dryRun) {
    logSection("Dry run complete");
    console.log("  Schedule changes were detected, but no file was written.");
    return;
  }

  writeFileSync(scheduleFilePath, `${JSON.stringify(nextSchedule, null, 2)}\n`, "utf8");

  logSection("Wrote updated schedule");
  console.log(`  ${path.relative(projectRoot, scheduleFilePath)}`);
}

main().catch((error) => {
  console.error("\n[SRH schedule updater] Fatal error");
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
