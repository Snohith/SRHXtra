import type { MetadataRoute } from "next";

import { getPublicSiteUrl } from "@/lib/content/site";
import { buildAbsoluteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    host: getPublicSiteUrl(),
    sitemap: buildAbsoluteUrl("/sitemap.xml"),
  };
}
