import fs from "node:fs";

import { resolveDataPath } from "@/lib/utils/paths";

export interface PointsTableRow {
  position: number;
  teamCode: string;
  team: string;
  matches: number;
  wins: number;
  losses: number;
  noResult: number;
  tied: number;
  points: number;
  netRunRate: string;
  for: string;
  against: string;
  recentForm: string[];
  sourceTeamLogo: string | null;
}

export interface PointsTableData {
  season: string;
  updatedAt: string;
  sourcePriority: string[];
  standings: PointsTableRow[];
}

export function getPointsTable() {
  const filePath = resolveDataPath("points-table.json");

  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PointsTableData;
}

export function getSrhPointsRow() {
  return getPointsTable()?.standings.find((row) => row.teamCode === "SRH") ?? null;
}
