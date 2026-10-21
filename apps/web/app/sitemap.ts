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
    "/about",
    "/contact",
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
    // The public API caps pageSize at 100; walk every page so older stories
    // stay discoverable once the archive passes that many.
    const articles: MetadataRoute.Sitemap = [];
    const pageSize = 100;
    for (let page = 1; ; page += 1) {
      const feed = await getFeed({ page, pageSize });
      articles.push(
        ...feed.data.map((a) => ({
          url: articleUrl(a.slug),
          lastModified: new Date(a.updatedAt),
        })),
      );
      if (articles.length >= feed.total || feed.data.length === 0) break;
    }
    return [...staticRoutes, ...playerProfiles, ...articles];
  } catch {
    return [...staticRoutes, ...playerProfiles];
  }
}
