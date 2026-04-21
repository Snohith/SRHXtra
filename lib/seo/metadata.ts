import type { Metadata } from "next";

import { getPublicSiteUrl, getSiteConfig } from "@/lib/content/site";

interface PageMetadataInput {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "profile";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
  tags?: string[];
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

export function buildAbsoluteUrl(path = "/") {
  const siteUrl = ensureTrailingSlash(getPublicSiteUrl());
  const normalizedPath = path === "/" ? "" : path.replace(/^\//, "");
  return new URL(normalizedPath, siteUrl).toString();
}

export function buildBaseMetadata(): Metadata {
  const site = getSiteConfig();

  return {
    metadataBase: new URL(ensureTrailingSlash(getPublicSiteUrl())),
    title: {
      default: "SRHXtra — Official Sunrisers Hyderabad News & Analysis",
      template: site.titleTemplate,
    },
    description: site.defaultDescription,
    openGraph: {
      type: "website",
      locale: site.locale,
      siteName: site.siteName,
      title: site.defaultTitle,
      description: site.defaultDescription,
      url: buildAbsoluteUrl("/"),
      images: [
        {
          url: buildAbsoluteUrl(site.defaultOgImage),
          alt: site.siteName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: site.defaultTitle,
      description: site.defaultDescription,
      images: [buildAbsoluteUrl(site.defaultOgImage)],
      site: "@srhxtra",
      creator: "@srhxtra",
    },
  };
}

export function buildPageMetadata({
  title,
  description,
  path = "/",
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  section,
  tags,
}: PageMetadataInput): Metadata {
  const site = getSiteConfig();
  const finalTitle = title ?? site.defaultTitle;
  const finalDescription = description ?? site.defaultDescription;
  const finalImage = image ?? site.defaultOgImage;

  return {
    title: finalTitle,
    description: finalDescription,
    keywords: tags,
    authors: authors?.map((name) => ({ name })),
    alternates: {
      canonical: buildAbsoluteUrl(path),
    },
    openGraph: {
      type,
      siteName: site.siteName,
      locale: site.locale,
      title: finalTitle,
      description: finalDescription,
      url: buildAbsoluteUrl(path),
      publishedTime,
      modifiedTime,
      authors,
      section,
      tags,
      images: [
        {
          url: buildAbsoluteUrl(finalImage),
          alt: finalTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
      images: [buildAbsoluteUrl(finalImage)],
    },
  };
}
