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

const DEFAULT_KEYWORDS = [
  "SRH",
  "Sunrisers Hyderabad",
  "SRHXtra",
  "IPL",
  "IPL 2026",
  "SRH news",
  "SRH match report",
  "SRH squad",
  "SRH points table",
  "SRH schedule",
];

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function getTwitterHandle(value?: string) {
  if (!value) {
    return "@srhxtra";
  }

  const cleaned = value.trim();
  if (!cleaned) {
    return "@srhxtra";
  }

  if (cleaned.startsWith("@")) {
    return cleaned;
  }

  const segments = cleaned.split("/").filter(Boolean);
  const handle = segments[segments.length - 1]?.replace(/^@/, "");

  return handle ? `@${handle}` : "@srhxtra";
}

export function buildAbsoluteUrl(path = "/") {
  const siteUrl = ensureTrailingSlash(getPublicSiteUrl());
  const normalizedPath = path === "/" ? "" : path.replace(/^\//, "");
  return new URL(normalizedPath, siteUrl).toString();
}

export function buildBaseMetadata(): Metadata {
  const site = getSiteConfig();
  const twitterHandle = getTwitterHandle(site.socials.x);

  return {
    metadataBase: new URL(ensureTrailingSlash(getPublicSiteUrl())),
    applicationName: site.siteName,
    title: {
      default: "SRHXtra — Independent Sunrisers Hyderabad News & Analysis",
      template: site.titleTemplate,
    },
    description: site.defaultDescription,
    keywords: DEFAULT_KEYWORDS,
    alternates: {
      canonical: buildAbsoluteUrl("/"),
    },
    category: "sports",
    creator: site.organization.name,
    publisher: site.organization.name,
    referrer: "origin-when-cross-origin",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
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
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: site.defaultTitle,
      description: site.defaultDescription,
      images: [buildAbsoluteUrl(site.defaultOgImage)],
      site: twitterHandle,
      creator: twitterHandle,
    },
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
      shortcut: ["/favicon.ico"],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/site.webmanifest",
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
  const twitterHandle = getTwitterHandle(site.socials.x);

  return {
    title: finalTitle,
    description: finalDescription,
    keywords: tags && tags.length > 0 ? tags : DEFAULT_KEYWORDS,
    authors: authors?.map((name) => ({ name })),
    alternates: {
      canonical: buildAbsoluteUrl(path),
    },
    robots: {
      index: true,
      follow: true,
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
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
      images: [buildAbsoluteUrl(finalImage)],
      site: twitterHandle,
      creator: twitterHandle,
    },
  };
}
