import pointsTable from "@/content/data/points-table.json";

/**
 * Utility to get team logos and colors based on team code or name.
 * Falls back to a default if the team is not found.
 */
export function getTeamInfo(teamIdentifier: string) {
  const normalized = teamIdentifier.trim().toUpperCase();
  
  // Try to find by code first
  let team = pointsTable.standings.find(t => t.teamCode === normalized);
  
  // Try to find by name if code fails
  if (!team) {
    team = pointsTable.standings.find(t => t.team.toUpperCase() === normalized);
  }

  // Common team name mappings (e.g. "Kolkata Knight Riders" -> "KKR")
  if (!team) {
    const mappings: Record<string, string> = {
      "KOLKATA KNIGHT RIDERS": "KKR",
      "MUMBAI INDIANS": "MI",
      "CHENNAI SUPER KINGS": "CSK",
      "DELHI CAPITALS": "DC",
      "GUJARAT TITANS": "GT",
      "LUCKNOW SUPER GIANTS": "LSG",
      "PUNJAB KINGS": "PBKS",
      "RAJASTHAN ROYALS": "RR",
      "ROYAL CHALLENGERS BENGALURU": "RCB",
      "SUNRISERS HYDERABAD": "SRH",
      "SUNRISERS": "SRH",
    };
    
    const code = mappings[normalized];
    if (code) {
      team = pointsTable.standings.find(t => t.teamCode === code);
    }
  }

  return {
    code: team?.teamCode || normalized.slice(0, 3),
    name: team?.team || teamIdentifier,
    logo: team?.sourceTeamLogo || null,
  };
}
