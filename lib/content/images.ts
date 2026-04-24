import type { Article } from "@/lib/content/articles";
import { getAllGalleryAlbums, type GalleryAlbum, type GalleryPhoto } from "@/lib/content/gallery";
import { getSchedule } from "@/lib/content/schedule";
import type { Player } from "@/lib/content/squad";

const ARTICLE_FALLBACKS = {
  news: "/images/articles/news-depth.svg",
  "match-coverage": "/images/articles/match-clinical-chase.svg",
} as const;

const PLAYER_FALLBACK_IMAGE = "/images/site/hero-placeholder.svg";
const GALLERY_FALLBACK_IMAGE = "/images/site/hero-placeholder.svg";
const GENERIC_MATCH_COVERAGES = new Set([
  "",
  "/images/articles/match-clinical-chase.svg",
]);
let cachedMatchGalleryLookup: Map<string, GalleryAlbum | null> | null = null;

const OPPONENT_ALIASES: Record<string, string[]> = {
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

interface ResolvedImage {
  src: string;
  alt: string;
  sourceUrl?: string;
  needsHumanReview?: boolean;
  fitClassName?: string;
  wrapperClassName?: string;
  isFallback?: boolean;
}

function cleanImageValue(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function extractMatchNumber(value: string) {
  const match = value.match(/\b(\d+)(?:st|nd|rd|th)?\s+match\b/i) ?? value.match(/\bmatch[-\s](\d+)\b/i);
  return match ? Number(match[1]) : null;
}

function getMatchGalleryLookup() {
  if (cachedMatchGalleryLookup) {
    return cachedMatchGalleryLookup;
  }

  const albums = getAllGalleryAlbums();
  cachedMatchGalleryLookup = new Map(
    getSchedule().fixtures
      .filter((fixture) => fixture.reportSlug)
      .map((fixture) => {
        const reportSlug = fixture.reportSlug ?? "";
        const reportMatchNumber = extractMatchNumber(reportSlug);
        const aliases = OPPONENT_ALIASES[fixture.opponent] ?? [fixture.opponent];

        const matchingAlbum = albums.find((album) => {
          const haystack = normalizeText(`${album.title} ${album.description}`);
          const aliasMatch = aliases.some((alias) => haystack.includes(normalizeText(alias)));
          const albumMatchNumber = extractMatchNumber(album.title);
          const numberMatch = reportMatchNumber === null || albumMatchNumber === reportMatchNumber;
          return aliasMatch && numberMatch;
        }) ?? null;

        return [reportSlug, matchingAlbum];
      }),
  );

  return cachedMatchGalleryLookup;
}

export function getGalleryAlbumForReportSlug(reportSlug: string) {
  return getMatchGalleryLookup().get(reportSlug) ?? null;
}

export function resolveArticleImage(article: Pick<Article, "collection" | "slug" | "coverImage" | "coverAlt" | "title">): ResolvedImage {
  const directCover = cleanImageValue(article.coverImage);

  if (article.collection === "match-coverage") {
    const galleryAlbum = getMatchGalleryLookup().get(article.slug) ?? null;
    const galleryCover = galleryAlbum ? resolveGalleryCoverImage(galleryAlbum) : null;
    const hasManualGalleryCover =
      typeof galleryAlbum?.coverOverrideIndex === "number" && galleryAlbum.photos?.[galleryAlbum.coverOverrideIndex];

    if (hasManualGalleryCover && galleryCover && !galleryCover.isFallback) {
      return {
        ...galleryCover,
        fitClassName: "object-cover object-top",
      };
    }
  }

  if (directCover && (article.collection !== "match-coverage" || !GENERIC_MATCH_COVERAGES.has(directCover))) {
    return {
      src: directCover,
      alt: cleanImageValue(article.coverAlt) || article.title,
      fitClassName: article.collection === "match-coverage" ? "object-cover object-top" : "object-cover",
      isFallback: false,
    };
  }

  if (article.collection === "match-coverage") {
    const galleryAlbum = getMatchGalleryLookup().get(article.slug) ?? null;

    if (galleryAlbum?.coverImage) {
      const galleryCover = resolveGalleryCoverImage(galleryAlbum);
      return {
        ...galleryCover,
        fitClassName: "object-cover object-top",
      };
    }
  }

  return {
    src: article.collection === "match-coverage" ? "/HGMJi97WUAAHHq1.jpeg" : ARTICLE_FALLBACKS[article.collection],
    alt: cleanImageValue(article.coverAlt) || article.title,
    fitClassName: article.collection === "match-coverage" ? "object-cover object-top" : "object-cover",
    isFallback: true,
  };
}

export function resolvePlayerImage(player: Pick<Player, "image" | "imageAlt" | "name">): ResolvedImage {
  return {
    src: cleanImageValue(player.image) || PLAYER_FALLBACK_IMAGE,
    alt: cleanImageValue(player.imageAlt) || `${player.name} squad profile image`,
    fitClassName: "object-cover object-top",
  };
}

export function resolveGalleryCoverImage(
  album: Pick<
    GalleryAlbum,
    | "coverImage"
    | "coverAlt"
    | "title"
    | "coverImageSourceUrl"
    | "sourceUrl"
    | "licensing"
    | "photos"
    | "coverOverrideIndex"
  >,
): ResolvedImage {
  // If a manual override index is set, use that photo instead of the auto-selected cover.
  const overridePhoto =
    typeof album.coverOverrideIndex === "number"
      ? album.photos?.[album.coverOverrideIndex]
      : undefined;

  const src = overridePhoto
    ? cleanImageValue(overridePhoto.src) || GALLERY_FALLBACK_IMAGE
    : cleanImageValue(album.coverImage) || GALLERY_FALLBACK_IMAGE;

  const alt = overridePhoto
    ? cleanImageValue(overridePhoto.alt) || album.title
    : cleanImageValue(album.coverAlt) || album.title;

  const sourceUrl = overridePhoto
    ? overridePhoto.sourceUrl ?? overridePhoto.src
    : album.coverImageSourceUrl ?? album.sourceUrl;

  return {
    src,
    alt,
    sourceUrl,
    needsHumanReview: album.licensing?.status !== undefined,
    fitClassName: "object-cover object-top",
  };
}

export function resolveGalleryPhotoImage(photo: Pick<GalleryPhoto, "src" | "alt" | "sourceUrl">): ResolvedImage {
  return {
    src: cleanImageValue(photo.src) || cleanImageValue(photo.sourceUrl) || GALLERY_FALLBACK_IMAGE,
    alt: cleanImageValue(photo.alt) || "Gallery image",
    sourceUrl: photo.sourceUrl,
    needsHumanReview: Boolean(photo.sourceUrl),
    fitClassName: "object-cover object-top",
  };
}
