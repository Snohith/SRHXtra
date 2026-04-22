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
    name: site.organization.name,
    description: site.organization.description,
    url: site.siteUrl,
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
    name: site.siteName,
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

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.seoDescription ?? article.excerpt,
    image: [buildAbsoluteUrl(article.ogImage ?? articleImage.src)],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: {
      "@type": "Person",
      name: article.author,
    },
    publisher: getPublisherObject(),
    mainEntityOfPage: buildAbsoluteUrl(article.url),
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
    url: buildAbsoluteUrl(`/squad/${player.slug}/`),
  };
}
