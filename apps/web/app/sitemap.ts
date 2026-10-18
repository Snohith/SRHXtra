import type { MetadataRoute } from "next";
import { articleUrl, getFeed, SITE_URL } from "@/lib/api";
import { FEED_FETCHED_AT, getAllProfiles } from "@/lib/players";

/**
 * Rendered per request: metadata routes like sitemap.xml do not reliably pick
 * up revalidatePath() from the worker's webhook, so keep the route itself
 * uncached. The article data still comes from the tag-cached feed
 * ("articles"), which the webhook purges on publish / update / archive.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/news",
    "/squad",
    "/matches",
  ].map((route) => ({
    url: `${SITE_URL}${route || "/"}`,
    lastModified: new Date(),
  }));

  const playerProfiles: MetadataRoute.Sitemap = getAllProfiles().map(
    (profile) => ({
      url: `${SITE_URL}/squad/${profile.slug}`,
      lastModified: new Date(FEED_FETCHED_AT),
      changeFrequency: "monthly",
      priority: 0.6,
    }),
  );

  try {
    const feed = await getFeed({ page: 1, pageSize: 100 });
    const articles: MetadataRoute.Sitemap = feed.data.map((a) => ({
      url: articleUrl(a.slug),
      lastModified: new Date(a.updatedAt),
    }));
    return [...staticRoutes, ...playerProfiles, ...articles];
  } catch {
    return [...staticRoutes, ...playerProfiles];
  }
}
