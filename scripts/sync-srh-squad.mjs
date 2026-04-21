#!/usr/bin/env node

import {
  absoluteUrl,
  cleanString,
  fetchText,
  logList,
  logSection,
  parseArgs,
  resolveProjectPath,
  slugify,
  stripTags,
  writeJsonFileIfChanged,
} from "./lib/sync-utils.mjs";

const TEAM_URL = "https://www.iplt20.com/teams/sunrisers-hyderabad";
const squadFilePath = resolveProjectPath("content", "data", "squad.json");

function parseSeasonLabel(html, seasonArg) {
  if (seasonArg) {
    return `IPL ${seasonArg}`;
  }

  const match = html.match(/SRH\s+(\d{4})\s+Squad\s*&amp;\s*Overview|SRH\s+(\d{4})\s+Squad\s*&\s*Overview/i);
  const year = match?.[1] ?? match?.[2];
  return year ? `IPL ${year}` : `IPL ${new Date().getUTCFullYear()}`;
}

function parseCaptainName(html) {
  const match = html.match(/Captain\s*-\s*([^<\n]+)/i);
  return cleanString(match?.[1] ?? "");
}

function parseTeamPlayers(html) {
  const playerPattern =
    /data-player_name="([^"]+)"[\s\S]*?href="(https:\/\/www\.iplt20\.com\/players\/[^"]+)"[\s\S]*?data-src="([^"]+)"[\s\S]*?<span class="d-block w-100 text-center">([^<]+)<\/span>/g;

  const players = [];
  let match;

  while ((match = playerPattern.exec(html)) !== null) {
    players.push({
      name: cleanString(match[1]),
      profileUrl: cleanString(match[2]),
      imageUrl: cleanString(match[3]),
      listedRole: cleanString(match[4]),
    });
  }

  return players;
}

function normalizeRole(rawRole, specialization) {
  const value = specialization || rawRole;

  if (/wicketkeeper/i.test(value) || /\bWK\b/i.test(rawRole)) {
    return "Wicketkeeper Batter";
  }

  if (/all[-\s]?rounder/i.test(value)) {
    return "All-rounder";
  }

  if (/bowler/i.test(value)) {
    return "Bowler";
  }

  return "Batter";
}

function parseProfile(html, profileUrl) {
  const name = cleanString(html.match(/<div class="plyr-name-nationality">[\s\S]*?<h1>([^<]+)<\/h1>/i)?.[1] ?? "");
  const nationality = cleanString(html.match(/<div class="plyr-name-nationality">[\s\S]*?<span>([^<]+)<\/span>/i)?.[1] ?? "");
  const specialization = cleanString(
    html.match(/<div class="grid-items">\s*<p>([^<]+)<\/p>\s*<span>Specialization<\/span>/i)?.[1]
      ?? "",
  );
  const matchesValue = cleanString(
    html.match(/<div class="grid-items">\s*<p>([^<]+)<\/p>\s*<span>Matches<\/span>/i)?.[1] ?? "",
  );
  const bio = stripTags(html.match(/<div class="ih-td-text">\s*<p>([\s\S]*?)<\/p>\s*<\/div>/i)?.[1] ?? "");
  const imageUrl = cleanString(html.match(/<div class="membr-details-img[\s\S]*?<img src="([^"]+)"/i)?.[1] ?? "");

  return {
    name,
    nationality,
    specialization,
    matches: Number(matchesValue),
    bio,
    imageUrl,
    profileUrl,
  };
}

function validatePlayers(players) {
  const requiredFieldGaps = [];
  const optionalFieldGaps = [];

  for (const player of players) {
    if (!player.name) {
      requiredFieldGaps.push(`${player.profileUrl} -> name`);
    }
    if (!player.role) {
      requiredFieldGaps.push(`${player.profileUrl} -> role`);
    }
    if (!player.nationality) {
      requiredFieldGaps.push(`${player.profileUrl} -> nationality`);
    }
    if (!player.image) {
      requiredFieldGaps.push(`${player.profileUrl} -> image`);
    }
    if (!player.bio) {
      optionalFieldGaps.push(`${player.profileUrl} -> bio`);
    }
    if (!Number.isFinite(player.stats.matches) || player.stats.matches < 0) {
      optionalFieldGaps.push(`${player.profileUrl} -> stats.matches`);
    }
  }

  if (optionalFieldGaps.length > 0) {
    logSection("Optional squad fields missing");
    logList(" - ", optionalFieldGaps);
  }

  if (requiredFieldGaps.length > 0) {
    logSection("Missing required squad fields");
    logList(" - ", requiredFieldGaps);
    throw new Error("Official squad data is incomplete. Aborting write.");
  }
}

export async function syncSrhSquad(options = {}) {
  const { dryRun = false, season } = options;

  logSection("Fetching official IPL SRH squad page");
  console.log(`[official-sync] Source: ${TEAM_URL}`);
  const teamHtml = await fetchText(TEAM_URL);
  const captainName = parseCaptainName(teamHtml);
  const listedPlayers = parseTeamPlayers(teamHtml);

  if (listedPlayers.length === 0) {
    throw new Error("Unable to parse any players from the official IPL team page.");
  }

  console.log(`[official-sync] Extracted ${listedPlayers.length} squad entries from the official team page.`);

  const profileRecords = await Promise.all(
    listedPlayers.map(async (listedPlayer) => {
      const profileHtml = await fetchText(listedPlayer.profileUrl);
      const profile = parseProfile(profileHtml, listedPlayer.profileUrl);
      const role = normalizeRole(listedPlayer.listedRole, profile.specialization);

      return {
        slug: slugify(profile.name || listedPlayer.name),
        name: profile.name || listedPlayer.name,
        fullName: profile.name || listedPlayer.name,
        role,
        nationality: profile.nationality,
        battingStyle: null,
        bowlingStyle: null,
        jerseyNumber: null,
        captain: cleanString(profile.name || listedPlayer.name) === captainName,
        wicketkeeper: /wicketkeeper/i.test(profile.specialization) || /\bWK\b/i.test(listedPlayer.listedRole),
        image: listedPlayer.imageUrl || profile.imageUrl,
        imageAlt: `${profile.name || listedPlayer.name} official SRH headshot`,
        bio: profile.bio || null,
        stats: {
          matches: Number.isFinite(profile.matches) ? profile.matches : null,
        },
        socials: {},
        editorialStatus: "verified",
        profileUrl: listedPlayer.profileUrl,
      };
    }),
  );

  validatePlayers(profileRecords);

  const nextSquad = {
    season: parseSeasonLabel(teamHtml, season),
    updatedAt: new Date().toISOString(),
    editorialStatus: "verified",
    players: profileRecords.map(({ profileUrl, ...player }) => player),
  };

  return writeJsonFileIfChanged(squadFilePath, nextSquad, {
    dryRun,
    label: "content/data/squad.json",
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));

  syncSrhSquad(args).catch((error) => {
    console.error(`[official-sync] Squad sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
