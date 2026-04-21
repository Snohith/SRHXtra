import fs from "node:fs";
import path from "node:path";

import { compareDatesDesc } from "@/lib/utils/date";
import { resolveContentPath } from "@/lib/utils/paths";
import {
  assertEditorialStatus,
  assertRequiredString,
  assertRequiredStringArray,
  type EditorialStatus,
} from "@/lib/content/validation";

export interface GalleryPhoto {
  src: string;
  alt: string;
  caption?: string;
  width?: number | null;
  height?: number | null;
  sourceUrl?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GalleryAlbum {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  coverImage: string;
  coverAlt: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  photos: GalleryPhoto[];
  editorialStatus?: EditorialStatus;
  sourceName?: string;
  sourceUrl?: string;
  coverImageSourceUrl?: string;
  licensing?: {
    status: "source-reference-only" | "manual-review-required";
    notes?: string;
  };
  isFallback?: boolean;
  fallbackType?: "limited-photos" | "infographics";
  sourceKind?: "official-gallery" | "match-report-cover" | "match-commentary-graphics" | "ipl-photos";
  /**
   * Optional manual override for the cover/thumbnail image.
   * When set, this index into `photos[]` is used instead of `coverImage`.
   * Only choose an index that exists in the album's photo array.
   */
  coverOverrideIndex?: number;
  url: string;
}

const GALLERY_DIR = resolveContentPath("gallery", "albums");

function readAlbum(filePath: string): GalleryAlbum {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(fileContent) as Omit<GalleryAlbum, "url">;

  if (!Array.isArray(data.photos) || data.photos.length === 0) {
    throw new Error(`Gallery album must include at least one photo: ${filePath}`);
  }

  return {
    ...data,
    slug: assertRequiredString(data.slug, "slug", filePath),
    title: assertRequiredString(data.title, "title", filePath),
    description: assertRequiredString(data.description, "description", filePath),
    publishedAt: assertRequiredString(data.publishedAt, "publishedAt", filePath),
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    coverImage: assertRequiredString(data.coverImage, "coverImage", filePath),
    coverAlt: assertRequiredString(data.coverAlt, "coverAlt", filePath),
    tags: assertRequiredStringArray(data.tags, "tags", filePath),
    photos: data.photos.map((photo, index) => ({
      src: assertRequiredString(photo.src, `photos[${index}].src`, filePath),
      alt: assertRequiredString(photo.alt, `photos[${index}].alt`, filePath),
      caption: photo.caption ? String(photo.caption) : undefined,
      width: typeof photo.width === "number" ? photo.width : null,
      height: typeof photo.height === "number" ? photo.height : null,
      sourceUrl: photo.sourceUrl ? String(photo.sourceUrl) : undefined,
      publishedAt: photo.publishedAt ? String(photo.publishedAt) : undefined,
      createdAt: photo.createdAt ? String(photo.createdAt) : undefined,
      updatedAt: photo.updatedAt ? String(photo.updatedAt) : undefined,
    })),
    editorialStatus: assertEditorialStatus(data.editorialStatus, filePath),
    sourceName: data.sourceName ? String(data.sourceName) : undefined,
    sourceUrl: data.sourceUrl ? String(data.sourceUrl) : undefined,
    coverImageSourceUrl: data.coverImageSourceUrl ? String(data.coverImageSourceUrl) : undefined,
    licensing: data.licensing,
    isFallback: data.isFallback,
    fallbackType: data.fallbackType,
    sourceKind: data.sourceKind,
    coverOverrideIndex: typeof data.coverOverrideIndex === "number" ? data.coverOverrideIndex : undefined,
    url: `/gallery/${data.slug}/`,
  };
}

export function getAllGalleryAlbums() {
  return fs
    .readdirSync(GALLERY_DIR)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => readAlbum(path.join(GALLERY_DIR, fileName)))
    .sort((left, right) => compareDatesDesc(left.publishedAt, right.publishedAt));
}

export function getGalleryAlbumBySlug(slug: string) {
  return getAllGalleryAlbums().find((album) => album.slug === slug) ?? null;
}

export function getGalleryAlbumSlugs() {
  return getAllGalleryAlbums().map((album) => album.slug);
}

export function getRelatedGalleryAlbums(slug: string, limit = 3) {
  return getAllGalleryAlbums()
    .filter((album) => album.slug !== slug)
    .slice(0, limit);
}
