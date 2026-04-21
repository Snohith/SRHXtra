#!/usr/bin/env node

import { execFileSync } from "node:child_process";

import { parseArgs, projectRoot } from "./lib/sync-utils.mjs";
import { syncMatchCoverageSources } from "./sync-match-coverage-sources.mjs";
import { syncOfficialGallery } from "./sync-official-gallery.mjs";
import { syncOfficialNews } from "./sync-official-news.mjs";
import { syncPointsTable } from "./sync-points-table.mjs";
import { syncSrhSquad } from "./sync-srh-squad.mjs";

function runScheduleSync(args) {
  const commandArgs = ["scripts/update-srh-schedule.mjs"];

  if (args.season) {
    commandArgs.push("--season", args.season);
  }

  if (args.dryRun) {
    commandArgs.push("--dry-run");
  }

  execFileSync(process.execPath, commandArgs, {
    cwd: projectRoot,
    stdio: "inherit",
  });
}

export async function syncOfficialData(options = {}) {
  runScheduleSync(options);
  await syncSrhSquad(options);
  await syncOfficialNews(options);
  await syncMatchCoverageSources(options);
  await syncPointsTable(options);
  await syncOfficialGallery(options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));

  syncOfficialData(args).catch((error) => {
    console.error(`[official-sync] Full data sync failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
