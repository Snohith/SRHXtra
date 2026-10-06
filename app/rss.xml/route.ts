import { getAllArticles } from "@/lib/content/articles";
import { getSiteConfig } from "@/lib/content/site";
import { buildAbsoluteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-static";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const site = getSiteConfig();
  const articles = getAllArticles().slice(0, 30);

  const items = articles
    .map((article) => {
      const link = buildAbsoluteUrl(article.url);
      return [
        "    <item>",
        `      <title>${escapeXml(article.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <description>${escapeXml(article.excerpt)}</description>`,
        `      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>`,
        `      <category>${escapeXml(article.category)}</category>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    `    <title>${escapeXml(site.siteName)}</title>`,
    `    <link>${escapeXml(buildAbsoluteUrl("/"))}</link>`,
    `    <description>${escapeXml(site.defaultDescription)}</description>`,
    "    <language>en-IN</language>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
