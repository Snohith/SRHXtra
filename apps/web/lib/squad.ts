/**
 * IPL 2026 Sunrisers Hyderabad squad.
 * Base list curated from the SRHXtra squad page, updated for the confirmed
 * October 2026 trade: T Natarajan in (SRH, revised ₹5 crore), Zeeshan
 * Ansari out (Delhi Capitals, ₹40 lakh). Totals: 25 players, 8 overseas.
 * Headshots: official IPL/SRH images (documents.iplt20.com, iplt20 image pool).
 */

export type SquadRole =
  "Batters" | "Wicketkeepers" | "All-rounders" | "Bowlers";

export interface SquadPlayer {
  name: string;
  /** Jersey number, where the official listings show one. */
  number?: number;
  country: string;
  bats: "Right-handed" | "Left-handed";
  role: SquadRole;
  captain?: boolean;
  /** Short tag rendered as a badge (e.g. trade arrivals). */
  tag?: string;
  /** Official headshot URL; players without one fall back to initials. */
  headshot?: string;
  /** True when the headshot is a 3:4 portrait rather than a 1:1 square. */
  headshotPortrait?: boolean;
}

export const SQUAD: SquadPlayer[] = [
  // Batters --------------------------------------------------------------
  {
    name: "Aniket Verma",
    number: 108,
    country: "Indian",
    bats: "Right-handed",
    role: "Batters",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2025/3576.png",
  },
  {
    name: "Smaran Ravichandran",
    number: 10,
    country: "Indian",
    bats: "Left-handed",
    role: "Batters",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/3752.png",
  },
  {
    name: "Travis Head",
    number: 62,
    country: "Australian",
    bats: "Left-handed",
    role: "Batters",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/37.png",
  },

  // Wicketkeepers --------------------------------------------------------
  {
    name: "Heinrich Klaasen",
    number: 45,
    country: "South African",
    bats: "Right-handed",
    role: "Wicketkeepers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/202.png",
  },
  {
    name: "Ishan Kishan",
    number: 23,
    country: "Indian",
    bats: "Left-handed",
    role: "Wicketkeepers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/164.png",
  },
  {
    name: "Salil Arora",
    number: 15,
    country: "Indian",
    bats: "Right-handed",
    role: "Wicketkeepers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/4556.png",
  },

  // All-rounders ---------------------------------------------------------
  {
    name: "Abhishek Sharma",
    number: 4,
    country: "Indian",
    bats: "Left-handed",
    role: "All-rounders",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/212.png",
  },
  {
    name: "Harsh Dubey",
    number: 7,
    country: "Indian",
    bats: "Left-handed",
    role: "All-rounders",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2025/1494.png",
  },
  {
    name: "Harshal Patel",
    number: 16,
    country: "Indian",
    bats: "Right-handed",
    role: "All-rounders",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2025/114.png",
  },
  {
    name: "Kamindu Mendis",
    number: 21,
    country: "Sri Lankan",
    bats: "Left-handed",
    role: "All-rounders",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/627.png",
  },
  {
    name: "Krains Fuletra",
    number: 37,
    country: "Indian",
    bats: "Right-handed",
    role: "All-rounders",
    headshot:
      "https://d1zakxcsliwds.cloudfront.net/image-pool/9fecac6eed314bb292f0ba807e53243b.png",
    headshotPortrait: true,
  },
  {
    name: "Liam Livingstone",
    country: "English",
    bats: "Right-handed",
    role: "All-rounders",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/183.png",
  },
  {
    name: "Nitish Kumar Reddy",
    number: 88,
    country: "Indian",
    bats: "Right-handed",
    role: "All-rounders",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/1944.png",
  },
  {
    name: "Shivang Kumar",
    number: 67,
    country: "Indian",
    bats: "Right-handed",
    role: "All-rounders",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/4561.png",
  },

  // Bowlers --------------------------------------------------------------
  {
    name: "Pat Cummins",
    number: 30,
    country: "Australian",
    bats: "Right-handed",
    role: "Bowlers",
    captain: true,
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/33.png",
  },
  {
    name: "Amit Kumar",
    number: 77,
    country: "Indian",
    bats: "Right-handed",
    role: "Bowlers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/4559.png",
  },
  {
    name: "Dilshan Madushanka",
    country: "Sri Lankan",
    bats: "Right-handed",
    role: "Bowlers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/1018.png",
  },
  {
    name: "Eshan Malinga",
    number: 97,
    country: "Sri Lankan",
    bats: "Right-handed",
    role: "Bowlers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/3339.png",
  },
  {
    name: "Gerald Coetzee",
    country: "South African",
    bats: "Right-handed",
    role: "Bowlers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2025/2535.png",
  },
  {
    name: "Jaydev Unadkat",
    number: 91,
    country: "Indian",
    bats: "Right-handed",
    role: "Bowlers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/180.png",
  },
  {
    name: "Onkar Tarmale",
    number: 93,
    country: "Indian",
    bats: "Right-handed",
    role: "Bowlers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/4560.png",
  },
  {
    name: "Praful Hinge",
    number: 18,
    country: "Indian",
    bats: "Right-handed",
    role: "Bowlers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/4558.png",
  },
  {
    name: "R.S Ambrish",
    country: "Indian",
    bats: "Left-handed",
    role: "Bowlers",
  },
  {
    name: "Sakib Hussain",
    number: 57,
    country: "Indian",
    bats: "Right-handed",
    role: "Bowlers",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/3104.png",
  },
  {
    name: "T Natarajan",
    number: 44,
    country: "Indian",
    bats: "Left-handed",
    role: "Bowlers",
    tag: "Trade signing",
    headshot: "https://documents.iplt20.com/ipl/IPLHeadshot2026/224.png",
  },
];

/** Role metadata: order, URL slug, labels, and editorial blurbs. */
export interface SquadRoleInfo {
  role: SquadRole;
  /** Lowercase key used in filter state and the ?role= URL parameter. */
  slug: string;
  /** Singular label for a single player ("Bowler"). */
  singular: string;
  /** Group blurb shown above each roster section. */
  blurb: string;
}

export const SQUAD_ROLES: SquadRoleInfo[] = [
  {
    role: "Batters",
    slug: "batters",
    singular: "Batter",
    blurb: "Powerplay destroyers and middle-order anchors.",
  },
  {
    role: "Wicketkeepers",
    slug: "wicketkeepers",
    singular: "Wicketkeeper",
    blurb: "Gloves on, finishers at the death.",
  },
  {
    role: "All-rounders",
    slug: "all-rounders",
    singular: "All-rounder",
    blurb: "Batting and bowling in the same player.",
  },
  {
    role: "Bowlers",
    slug: "bowlers",
    singular: "Bowler",
    blurb: "Quick pace and spin, led by the captain.",
  },
];

const ROLE_BY_SLUG = new Map(SQUAD_ROLES.map((r) => [r.slug, r.role]));

/** Resolve a ?role= slug to a SquadRole; null when absent or unknown. */
export function roleFromSlug(slug: string | null): SquadRole | null {
  return slug ? (ROLE_BY_SLUG.get(slug) ?? null) : null;
}

export function roleInfo(role: SquadRole): SquadRoleInfo {
  const info = SQUAD_ROLES.find((r) => r.role === role);
  if (!info) throw new Error(`Unknown squad role: ${role}`);
  return info;
}

/** Country metadata for badges, filters, and structured data. */
export interface CountryInfo {
  /** Cricket-style three-letter code (IND, AUS, …). */
  code: string;
  /** Country name for structured data. */
  country: string;
  /** True for players outside India — the IPL "overseas" quota. */
  overseas: boolean;
}

export const COUNTRIES: Record<string, CountryInfo> = {
  Indian: { code: "IND", country: "India", overseas: false },
  Australian: { code: "AUS", country: "Australia", overseas: true },
  English: { code: "ENG", country: "England", overseas: true },
  "South African": {
    code: "SA",
    country: "South Africa",
    overseas: true,
  },
  "Sri Lankan": { code: "SL", country: "Sri Lanka", overseas: true },
};

export function countryInfo(demonym: string): CountryInfo {
  return (
    COUNTRIES[demonym] ?? {
      code: demonym.slice(0, 3).toUpperCase(),
      country: demonym,
      overseas: true,
    }
  );
}

export function isOverseas(player: SquadPlayer): boolean {
  return countryInfo(player.country).overseas;
}

/** "Right-handed" → "RHB" (batting-hand shorthand used on team sheets). */
export function battingCode(player: SquadPlayer): "RHB" | "LHB" {
  return player.bats === "Right-handed" ? "RHB" : "LHB";
}

export const HEAD_COACH = "Daniel Vettori";

export const CAPTAIN = SQUAD.find((p) => p.captain);

export const OVERSEAS_COUNT = SQUAD.filter(isOverseas).length;

export const DOMESTIC_COUNT = SQUAD.length - OVERSEAS_COUNT;

export function roleCount(role: SquadRole): number {
  return SQUAD.filter((p) => p.role === role).length;
}

/** "T Natarajan" → "TN" — used for the card avatars. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** "T Natarajan" → "t-natarajan" — canonical profile URL segment. */
export function playerSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
