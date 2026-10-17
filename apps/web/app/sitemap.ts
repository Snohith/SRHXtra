import type { MetadataRoute } from "next";
import { articleUrl, getFeed, SITE_URL } from "@/lib/api";

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
  try {
    const feed = await getFeed({ page: 1, pageSize: 100 });
    const articles: MetadataRoute.Sitemap = feed.data.map((a) => ({
      url: articleUrl(a.slug),
      lastModified: new Date(a.updatedAt),
    }));
    return [...staticRoutes, ...articles];
  } catch {
    return staticRoutes;
  }
}
