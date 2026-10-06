import type { Article } from "@/lib/content/articles";
import type { GalleryAlbum } from "@/lib/content/gallery";
import type { Player } from "@/lib/content/squad";

import {
  resolveArticleImage,
  resolveGalleryCoverImage,
  resolveGalleryPhotoImage,
  resolvePlayerImage,
} from "@/lib/content/images";
import { getSiteConfig } from "@/lib/content/site";
import { buildAbsoluteUrl } from "@/lib/seo/metadata";

function getPublisherObject() {
  const site = getSiteConfig();

  return {
    "@type": "Organization",
    "@id": buildAbsoluteUrl("/#organization"),
    name: site.organization.name,
    description: site.organization.description,
    url: buildAbsoluteUrl("/"),
    logo: buildAbsoluteUrl(site.organization.logo),
    sameAs: site.organization.sameAs,
  };
}

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    ...getPublisherObject(),
  };
}

export function getWebsiteJsonLd() {
  const site = getSiteConfig();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": buildAbsoluteUrl("/#website"),
    name: site.siteName,
    alternateName: "Sunrisers Hyderabad News, Reports and Photos",
    description: site.defaultDescription,
    url: buildAbsoluteUrl("/"),
    inLanguage: "en-IN",
    publisher: getPublisherObject(),
  };
}

interface JsonLdBreadcrumbItem {
  name: string;
  url: string;
}

export function getBreadcrumbJsonLd(items: JsonLdBreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.url),
    })),
  };
}

export function getArticleJsonLd(article: Article) {
  const articleImage = resolveArticleImage(article);
  const articleType = article.collection === "match-previews" ? "Article" : "NewsArticle";
  const pageUrl = buildAbsoluteUrl(article.url);

  return {
    "@context": "https://schema.org",
    "@type": articleType,
    "@id": `${pageUrl}#article`,
    headline: article.title,
    description: article.seoDescription ?? article.excerpt,
    image: [buildAbsoluteUrl(article.ogImage ?? articleImage.src)],
    thumbnailUrl: buildAbsoluteUrl(article.ogImage ?? articleImage.src),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: getPublisherObject(),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    articleSection: article.category,
    keywords: article.tags.join(", "),
  };
}

export function getGalleryJsonLd(album: GalleryAlbum) {
  const coverImage = resolveGalleryCoverImage(album);

  return {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: album.title,
    description: album.seoDescription ?? album.description,
    url: buildAbsoluteUrl(album.url),
    datePublished: album.publishedAt,
    dateModified: album.updatedAt ?? album.publishedAt,
    image: [
      {
        "@type": "ImageObject",
        contentUrl: buildAbsoluteUrl(coverImage.src),
        caption: coverImage.alt,
      },
      ...album.photos.map((photo) => {
        const photoImage = resolveGalleryPhotoImage(photo);
        return {
          "@type": "ImageObject",
          contentUrl: buildAbsoluteUrl(photoImage.src),
          caption: photo.caption ?? photoImage.alt,
          ...(photo.width ? { width: photo.width } : {}),
          ...(photo.height ? { height: photo.height } : {}),
        };
      }),
    ],
    publisher: getPublisherObject(),
  };
}

export function getPlayerJsonLd(player: Player) {
  const playerImage = resolvePlayerImage(player);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.fullName,
    alternateName: player.name,
    description: player.bio ?? `${player.name} squad profile.`,
    image: buildAbsoluteUrl(playerImage.src),
    nationality: player.nationality,
    jobTitle: player.role,
    url: buildAbsoluteUrl(`/sunrisers-hyderabad/squad/${player.slug}/`),
  };
}

interface ItemListEntry {
  name: string;
  url: string;
  image?: string;
  datePublished?: string;
}

/**
 * ItemList for archive/listing pages. Helps search (and AI-answer) systems
 * understand the collection without inventing per-item facts.
 */
export function getItemListJsonLd(items: ItemListEntry[], listUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: buildAbsoluteUrl(listUrl),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: buildAbsoluteUrl(item.url),
      ...(item.image ? { image: buildAbsoluteUrl(item.image) } : {}),
      ...(item.datePublished ? { datePublished: item.datePublished } : {}),
    })),
  };
}

interface SportsEventInput {
  name: string;
  date: string;
  time: string;
  venue: string;
  url?: string;
  eventStatus?: string;
}

/**
 * SportsEvent for fixtures. startDate is composed from the schedule's
 * YYYY-MM-DD date plus HH:mm IST time; when parsing fails the date alone
 * is used so output is never an invalid date-time.
 */
export function getSportsEventJsonLd(events: SportsEventInput[]) {
  return events.map((event) => {
    const timeMatch = event.time.match(/(\d{1,2}):(\d{2})/);
    const startDate = timeMatch
      ? `${event.date}T${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}:00+05:30`
      : event.date;

    return {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: event.name,
      sport: "Cricket",
      startDate,
      eventStatus: event.eventStatus ?? "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: event.venue,
      },
      competitor: [
        { "@type": "SportsTeam", name: "Sunrisers Hyderabad" },
      ],
      ...(event.url ? { url: buildAbsoluteUrl(event.url) } : {}),
    };
  });
}
