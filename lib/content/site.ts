import fs from "node:fs";
import matter from "gray-matter";

import { normalizeBasePath, resolveDataPath, resolveContentPath } from "@/lib/utils/paths";

export interface SiteLink {
  label: string;
  href: string;
}

export interface SiteSocials {
  x?: string;
  instagram?: string;
  youtube?: string;
  email?: string;
}

export interface OrganizationConfig {
  name: string;
  description: string;
  logo: string;
  sameAs: string[];
}

export interface HomepageConfig {
  heroTitle: string;
  heroDescription: string;
  featuredNewsSlug: string;
  featuredGallerySlug: string;
  nextFixtureId: string;
  heroImage?: string;
}

export interface SiteConfig {
  siteName: string;
  siteUrl: string;
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultOgImage: string;
  locale: string;
  tagline: string;
  footerHeadline: string;
  socials: SiteSocials;
  navLinks: SiteLink[];
  footerLinks: SiteLink[];
  organization: OrganizationConfig;
  homepage: HomepageConfig;
}

export interface StaticPage {
  slug: string;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  content: string;
}

function sanitizeSiteUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getSiteConfig(): SiteConfig {
  const fileContent = fs.readFileSync(resolveDataPath("site.json"), "utf8");
  const config = JSON.parse(fileContent) as SiteConfig;
  const siteUrlOverride = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  return {
    ...config,
    siteUrl: sanitizeSiteUrl(siteUrlOverride || config.siteUrl),
  };
}

export function getBasePath() {
  return normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
}

export function getPublicSiteUrl() {
  return getSiteConfig().siteUrl;
}

export function getStaticPage(slug: "about-us" = "about-us"): StaticPage {
  const fileName = "about.md";
  const fileContent = fs.readFileSync(resolveContentPath("pages", fileName), "utf8");
  const { content, data } = matter(fileContent);

  return {
    slug,
    title: String(data.title),
    seoTitle: data.seoTitle ? String(data.seoTitle) : undefined,
    seoDescription: data.seoDescription ? String(data.seoDescription) : undefined,
    content,
  };
}
