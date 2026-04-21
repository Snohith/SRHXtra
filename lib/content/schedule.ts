import fs from "node:fs";

import { resolveDataPath } from "@/lib/utils/paths";
import {
  assertEditorialStatus,
  assertRequiredString,
  type EditorialStatus,
} from "@/lib/content/validation";

export interface Fixture {
  id: string;
  slug: string;
  competition: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  homeAway: "home" | "away";
  status: "upcoming" | "completed";
  result?: string;
  reportSlug?: string;
  notes?: string;
  outcome?: "won" | "lost";
  margin?: string;
  playerOfTheMatch?: string;
  editorialStatus?: EditorialStatus;
}

export interface Schedule {
  season: string;
  updatedAt: string;
  editorialStatus?: EditorialStatus;
  fixtures: Fixture[];
}

interface MatchCoverageSource {
  id: string;
  playerOfTheMatch?: string | null;
}

function assertHomeAway(value: unknown, field: string, filePath: string): Fixture["homeAway"] {
  if (value === "home" || value === "away") {
    return value;
  }

  throw new Error(`Invalid homeAway in ${filePath} -> ${field}. Use "home" or "away".`);
}

function assertFixtureStatus(value: unknown, field: string, filePath: string): Fixture["status"] {
  if (value === "upcoming" || value === "completed") {
    return value;
  }

  throw new Error(`Invalid status in ${filePath} -> ${field}. Use "upcoming" or "completed".`);
}

function getCompletedMatchDetails() {
  const filePath = resolveDataPath("match-coverage-sources.json");

  if (!fs.existsSync(filePath)) {
    return new Map<string, MatchCoverageSource>();
  }

  const fileContent = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(fileContent) as { matches?: MatchCoverageSource[] };
  const matches = Array.isArray(data.matches) ? data.matches : [];

  return new Map(
    matches
      .filter((match) => typeof match.id === "string" && match.id.length > 0)
      .map((match) => [match.id, match]),
  );
}

function getOutcome(result?: string): Fixture["outcome"] {
  if (!result) {
    return undefined;
  }

  if (result.startsWith("Sunrisers Hyderabad Won")) {
    return "won";
  }

  if (result.includes("Won")) {
    return "lost";
  }

  return undefined;
}

function getMargin(result?: string) {
  if (!result) {
    return undefined;
  }

  const marginMatch = result.match(/\bby\s+(.+)$/i);
  return marginMatch?.[1]?.trim();
}

export function getSchedule(): Schedule {
  const fileContent = fs.readFileSync(resolveDataPath("schedule.json"), "utf8");
  const schedule = JSON.parse(fileContent) as Schedule;
  const filePath = resolveDataPath("schedule.json");
  const completedMatchDetails = getCompletedMatchDetails();

  if (!Array.isArray(schedule.fixtures) || schedule.fixtures.length === 0) {
    throw new Error(`Schedule must include at least one fixture: ${filePath}`);
  }

  return {
    season: assertRequiredString(schedule.season, "season", filePath),
    updatedAt: assertRequiredString(schedule.updatedAt, "updatedAt", filePath),
    editorialStatus: assertEditorialStatus(schedule.editorialStatus, filePath),
    fixtures: schedule.fixtures.map((fixture, index) => {
      const result = fixture.result ? String(fixture.result) : undefined;
      const matchDetails = completedMatchDetails.get(String(fixture.id));

      return {
        id: assertRequiredString(fixture.id, `fixtures[${index}].id`, filePath),
        slug: assertRequiredString(fixture.slug, `fixtures[${index}].slug`, filePath),
        competition: assertRequiredString(
          fixture.competition,
          `fixtures[${index}].competition`,
          filePath,
        ),
        opponent: assertRequiredString(fixture.opponent, `fixtures[${index}].opponent`, filePath),
        date: assertRequiredString(fixture.date, `fixtures[${index}].date`, filePath),
        time: assertRequiredString(fixture.time, `fixtures[${index}].time`, filePath),
        venue: assertRequiredString(fixture.venue, `fixtures[${index}].venue`, filePath),
        homeAway: assertHomeAway(fixture.homeAway, `fixtures[${index}].homeAway`, filePath),
        status: assertFixtureStatus(fixture.status, `fixtures[${index}].status`, filePath),
        result,
        reportSlug: fixture.reportSlug ? String(fixture.reportSlug) : undefined,
        notes: fixture.notes ? String(fixture.notes) : undefined,
        outcome: getOutcome(result),
        margin: getMargin(result),
        playerOfTheMatch: matchDetails?.playerOfTheMatch ? String(matchDetails.playerOfTheMatch) : undefined,
        editorialStatus: assertEditorialStatus(fixture.editorialStatus, filePath),
      };
    }),
  };
}

export function getNextFixture() {
  return getSchedule().fixtures.find((fixture) => fixture.status === "upcoming") ?? null;
}

export function getFixtureById(id: string) {
  return getSchedule().fixtures.find((fixture) => fixture.id === id) ?? null;
}

export function getFixturesByStatus(status: Fixture["status"]) {
  return getSchedule().fixtures.filter((fixture) => fixture.status === status);
}

export function getLatestCompletedFixture() {
  return (
    [...getSchedule().fixtures]
      .filter((fixture) => fixture.status === "completed")
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]
    ?? null
  );
}
