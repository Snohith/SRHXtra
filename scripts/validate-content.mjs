#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const articleCollections = [
  { name: "news", dir: "content/news" },
  { name: "match-previews", dir: "content/match-previews" },
  { name: "match-coverage", dir: "content/match-coverage" },
];

const requiredArticleFields = [
  "slug",
  "title",
  "excerpt",
  "publishedAt",
  "updatedAt",
  "author",
  "category",
  "tags",
];

const requiredPreviewFields = ["matchDate", "venue", "homeTeam", "awayTeam"];
const requiredReportFields = ["matchDate", "venue", "homeTeam", "awayTeam", "result"];
const requiredPointsFields = ["position", "team", "played", "won", "lost", "points", "netRunRate"];

const teamCodes = new Map([
  ["CHENNAI SUPER KINGS", "CSK"],
  ["CSK", "CSK"],
  ["DELHI CAPITALS", "DC"],
  ["DC", "DC"],
  ["GUJARAT TITANS", "GT"],
  ["GT", "GT"],
  ["KOLKATA KNIGHT RIDERS", "KKR"],
  ["KKR", "KKR"],
  ["LUCKNOW SUPER GIANTS", "LSG"],
  ["LSG", "LSG"],
  ["MUMBAI INDIANS", "MI"],
  ["MI", "MI"],
  ["PUNJAB KINGS", "PBKS"],
  ["PBKS", "PBKS"],
  ["RAJASTHAN ROYALS", "RR"],
  ["RR", "RR"],
  ["ROYAL CHALLENGERS BENGALURU", "RCB"],
  ["RCB", "RCB"],
  ["SUNRISERS HYDERABAD", "SRH"],
  ["SUNRISERS", "SRH"],
  ["SRH", "SRH"],
]);

const errors = [];

function projectPath(...segments) {
  return path.join(rootDir, ...segments);
}

function displayPath(filePath) {
  return path.relative(rootDir, filePath);
}

function addError(message) {
  errors.push(message);
}

function isPresent(value) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && String(value).trim() !== "";
}

function normalizeScalar(value) {
  return String(value ?? "").trim();
}

function normalizeDate(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return normalizeScalar(value).slice(0, 10);
}

function normalizeTeam(value) {
  const normalized = normalizeScalar(value).toUpperCase();

  return teamCodes.get(normalized) ?? normalized;
}

function readJson(relativePath) {
  const filePath = projectPath(relativePath);

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    addError(`${relativePath}: failed to parse JSON (${error.message})`);
    return null;
  }
}

function readMarkdownCollection(collection) {
  const dirPath = projectPath(collection.dir);

  if (!fs.existsSync(dirPath)) {
    addError(`${collection.dir}: directory does not exist`);
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const filePath = path.join(dirPath, fileName);

      try {
        const { data } = matter(fs.readFileSync(filePath, "utf8"));

        return {
          collection: collection.name,
          data,
          fileName,
          filePath,
          relativePath: displayPath(filePath),
          slug: normalizeScalar(data.slug),
        };
      } catch (error) {
        addError(`${displayPath(filePath)}: failed to parse frontmatter (${error.message})`);
        return null;
      }
    })
    .filter(Boolean);
}

function validateRequiredFields(article, fields) {
  for (const field of fields) {
    if (!isPresent(article.data[field])) {
      addError(`${article.relativePath}: missing required frontmatter field "${field}"`);
    }
  }
}

function compareField({ article, fixture, articleField, fixtureField, label, normalize = normalizeScalar }) {
  const articleValue = normalize(article.data[articleField]);
  const fixtureValue = normalize(fixture[fixtureField]);

  if (articleValue !== fixtureValue) {
    addError(
      `${article.relativePath}: ${label} mismatch for fixture "${fixture.id}" (${articleValue || "<missing>"} !== ${fixtureValue || "<missing>"})`,
    );
  }
}

const articles = articleCollections.flatMap(readMarkdownCollection);
const articlesBySlug = new Map();

for (const article of articles) {
  validateRequiredFields(article, requiredArticleFields);

  if (!article.slug) {
    continue;
  }

  const existing = articlesBySlug.get(article.slug);

  if (existing) {
    addError(
      `Duplicate article slug "${article.slug}" in ${existing.relativePath} and ${article.relativePath}`,
    );
  } else {
    articlesBySlug.set(article.slug, article);
  }

  if (article.collection === "match-previews") {
    validateRequiredFields(article, requiredPreviewFields);
  }

  if (article.collection === "match-coverage") {
    validateRequiredFields(article, requiredReportFields);
  }
}

const previewBySlug = new Map(
  articles
    .filter((article) => article.collection === "match-previews" && article.slug)
    .map((article) => [article.slug, article]),
);

const reportBySlug = new Map(
  articles
    .filter((article) => article.collection === "match-coverage" && article.slug)
    .map((article) => [article.slug, article]),
);

const schedule = readJson("content/data/schedule.json");

if (schedule) {
  if (!Array.isArray(schedule.fixtures)) {
    addError("content/data/schedule.json: fixtures must be an array");
  } else {
    for (const fixture of schedule.fixtures) {
      if (fixture.previewSlug) {
        const preview = previewBySlug.get(String(fixture.previewSlug));

        if (!preview) {
          addError(
            `content/data/schedule.json: fixture "${fixture.id}" previewSlug "${fixture.previewSlug}" does not match an existing match preview`,
          );
        } else {
          compareField({
            article: preview,
            fixture,
            articleField: "matchDate",
            fixtureField: "date",
            label: "preview matchDate",
            normalize: normalizeDate,
          });
          compareField({
            article: preview,
            fixture,
            articleField: "venue",
            fixtureField: "venue",
            label: "preview venue",
          });
          compareField({
            article: preview,
            fixture,
            articleField: "homeTeam",
            fixtureField: "homeTeam",
            label: "preview homeTeam",
            normalize: normalizeTeam,
          });
          compareField({
            article: preview,
            fixture,
            articleField: "awayTeam",
            fixtureField: "awayTeam",
            label: "preview awayTeam",
            normalize: normalizeTeam,
          });
        }
      }

      if (fixture.status === "completed" && fixture.reportSlug) {
        const report = reportBySlug.get(String(fixture.reportSlug));

        if (!report) {
          addError(
            `content/data/schedule.json: completed fixture "${fixture.id}" reportSlug "${fixture.reportSlug}" does not match an existing match coverage report`,
          );
        } else {
          compareField({
            article: report,
            fixture,
            articleField: "matchDate",
            fixtureField: "date",
            label: "report matchDate",
            normalize: normalizeDate,
          });
          compareField({
            article: report,
            fixture,
            articleField: "venue",
            fixtureField: "venue",
            label: "report venue",
          });
          compareField({
            article: report,
            fixture,
            articleField: "homeTeam",
            fixtureField: "homeTeam",
            label: "report homeTeam",
            normalize: normalizeTeam,
          });
          compareField({
            article: report,
            fixture,
            articleField: "awayTeam",
            fixtureField: "awayTeam",
            label: "report awayTeam",
            normalize: normalizeTeam,
          });
        }
      }
    }
  }
}

const pointsTable = readJson("content/data/points-table.json");

const seasonStats = readJson("content/data/player-season-stats.json");

if (seasonStats) {
  if (!Array.isArray(seasonStats.players) || seasonStats.players.length === 0) {
    addError("content/data/player-season-stats.json: players must be a non-empty array");
  } else {
    const slugs = new Set();
    const leaderSlug =
      typeof seasonStats.playerOfTheSeason === "string" ? seasonStats.playerOfTheSeason.trim() : "";
    let topRunScorer = null;

    seasonStats.players.forEach((player, index) => {
      const label = `content/data/player-season-stats.json: players[${index}]`;

      if (!isPresent(player.slug)) {
        addError(`${label} missing required field "slug"`);
      } else if (slugs.has(String(player.slug))) {
        addError(`${label} has duplicate slug "${player.slug}"`);
      } else {
        slugs.add(String(player.slug));
      }

      if (!isPresent(player.name)) {
        addError(`${label} missing required field "name"`);
      }

      if (player.primaryStat !== "batting" && player.primaryStat !== "bowling") {
        addError(`${label} has invalid primaryStat "${player.primaryStat}" (expected "batting" or "bowling")`);
      }

      if (!Number.isFinite(Number(player.matches))) {
        addError(`${label} missing numeric field "matches"`);
      }

      if (player.runs !== undefined && player.balls !== undefined) {
        const runs = Number(player.runs);
        const balls = Number(player.balls);
        const listed = Number(player.strikeRate);

        if (Number.isFinite(runs) && Number.isFinite(balls) && balls > 0 && Number.isFinite(listed)) {
          const expected = Math.round((runs / balls) * 1000) / 10;

          if (Math.abs(expected - listed) > 0.05) {
            addError(
              `${label} strikeRate ${listed} is inconsistent with runs/balls (${runs}/${balls} => ${expected})`,
            );
          }
        } else {
          addError(`${label} has non-numeric runs/balls/strikeRate`);
        }
      }

      if ((player.runs ?? 0) > (topRunScorer?.runs ?? -1)) {
        topRunScorer = player;
      }
    });

    if (leaderSlug && topRunScorer && leaderSlug !== String(topRunScorer.slug)) {
      addError(
        `content/data/player-season-stats.json: playerOfTheSeason "${leaderSlug}" does not match leading run scorer "${topRunScorer.slug}"`,
      );
    }
  }
}

if (pointsTable) {
  if (!Array.isArray(pointsTable.standings)) {
    addError("content/data/points-table.json: standings must be an array");
  } else {
    if (pointsTable.standings.length !== 10) {
      addError(
        `content/data/points-table.json: standings must include exactly 10 teams (found ${pointsTable.standings.length})`,
      );
    }

    pointsTable.standings.forEach((row, index) => {
      for (const field of requiredPointsFields) {
        if (!isPresent(row[field])) {
          addError(
            `content/data/points-table.json: standings[${index}] missing required field "${field}"`,
          );
        }
      }
    });
  }
}

if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}:`);

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exit(1);
}

console.log(`Content validation passed. Checked ${articles.length} Markdown articles, schedule fixtures and points table rows.`);
