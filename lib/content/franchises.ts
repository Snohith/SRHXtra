/**
 * Franchise registry + equivalent-page path mapping.
 *
 * Single source of truth for the four Sunrisers franchises. Only Hyderabad
 * has live routes today, so every other franchise resolves conservatively
 * (section indexes and the hub) until its routes ship — at which point
 * flipping `routesLive` activates full equivalent-page switching with no
 * component changes.
 */

export interface FranchiseConfig {
  slug: "sunrisers-hyderabad" | "sunrisers-eastern-cape" | "sunrisers-leeds-men" | "sunrisers-leeds-women";
  label: string;
  shortLabel: string;
  crest: string;
  crestAlt: string;
  /** Content exists and the pill may link out. */
  enabled: boolean;
  /** Prefixed routes (/<slug>/...) are built — enables segment swapping. */
  routesLive: boolean;
  /** Section indexes this franchise publishes. */
  sections: string[];
}

const ALL_SECTIONS = [
  "news",
  "match-previews",
  "match-coverage",
  "points-table",
  "player-poll",
  "gallery",
  "schedule",
  "squad",
];

const LEAN_SECTIONS = ["news", "match-coverage", "squad", "schedule", "gallery"];

export const FRANCHISES: FranchiseConfig[] = [
  {
    slug: "sunrisers-hyderabad",
    label: "Hyderabad",
    shortLabel: "SRH",
    crest: "/images/franchises/hyderabad.png",
    crestAlt: "Sunrisers Hyderabad crest",
    enabled: true,
    routesLive: true,
    sections: ALL_SECTIONS,
  },
  {
    slug: "sunrisers-eastern-cape",
    label: "Eastern Cape",
    shortLabel: "SEC",
    crest: "/images/franchises/eastern-cape.png",
    crestAlt: "Sunrisers Eastern Cape crest",
    enabled: false,
    routesLive: false,
    sections: ALL_SECTIONS,
  },
  {
    slug: "sunrisers-leeds-men",
    label: "Leeds Men",
    shortLabel: "SLM",
    crest: "/images/franchises/leeds.svg",
    crestAlt: "Sunrisers Leeds crest",
    enabled: false,
    routesLive: false,
    sections: ALL_SECTIONS,
  },
  {
    slug: "sunrisers-leeds-women",
    label: "Leeds Women",
    shortLabel: "SLW",
    crest: "/images/franchises/leeds.svg",
    crestAlt: "Sunrisers Leeds crest",
    enabled: false,
    routesLive: false,
    sections: LEAN_SECTIONS,
  },
];

export function getFranchise(slug: string): FranchiseConfig | null {
  return FRANCHISES.find((franchise) => franchise.slug === slug) ?? null;
}

export function isFranchiseSlug(value: string): boolean {
  return FRANCHISES.some((franchise) => franchise.slug === value);
}

export interface SplitPath {
  /** Explicit franchise prefix, or null for legacy flat SRH routes. */
  franchise: string | null;
  /** Segments after the (optional) franchise prefix. */
  rest: string[];
}

export function splitPathname(pathname: string): SplitPath {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length > 0 && isFranchiseSlug(segments[0])) {
    return { franchise: segments[0], rest: segments.slice(1) };
  }

  return { franchise: null, rest: segments };
}

/** Legacy flat routes belong to Hyderabad until the URL migration ships. */
export function getPathFranchise(pathname: string): string {
  return splitPathname(pathname).franchise ?? "sunrisers-hyderabad";
}

/**
 * Counterpart of `pathname` inside the target franchise.
 *
 * - Section indexes swap cleanly when the target publishes that section.
 * - Detail pages (player, article, album) fall back to the section index —
 *   slugs are franchise-specific until cross-franchise entities land.
 * - Anything unknown falls back to the franchise home, never a 404.
 * - Targets without live prefixed routes resolve to the current page (when
 *   it is the current context) or the hub, so nothing links to thin air.
 */
export function getEquivalentPath(pathname: string, targetSlug: string): string {
  const target = getFranchise(targetSlug);

  if (!target) {
    return pathname;
  }

  const { franchise, rest } = splitPathname(pathname);
  const current = franchise ?? "sunrisers-hyderabad";

  if (!target.routesLive) {
    return current === targetSlug ? pathname : "/";
  }

  if (rest.length === 0) {
    return `/${targetSlug}/`;
  }

  const [section, ...tail] = rest;

  if (!target.sections.includes(section)) {
    return `/${targetSlug}/`;
  }

  if (tail.length > 0) {
    return `/${targetSlug}/${section}/`;
  }

  return `/${targetSlug}/${section}/`;
}
