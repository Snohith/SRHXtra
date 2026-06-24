import { HeroSection } from "@/components/home/HeroSection";
import { getArticleBySlug, getLatestArticles } from "@/lib/content/articles";
import { getLatestMatchReport } from "@/lib/content/match-coverage";
import { getSiteConfig } from "@/lib/content/site";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { LatestNewsFeed } from "@/components/home/LatestNewsFeed";
import { ArticleCard } from "@/components/articles/ArticleCard";

export const metadata = buildPageMetadata({
  title: "Sunrisers Hyderabad News, Match Reports & IPL 2026 Coverage",
  description: "The premier independent destination for Sunrisers Hyderabad supporters. Featuring sharper match coverage, tactical analysis, official squad updates, and immersive photo galleries for the Orange Army.",
  path: "/",
});

export default function HomePage() {
  const site = getSiteConfig();
  const latestNews = getLatestArticles("news", 6);
  const featuredNews =
    latestNews[0]
    ?? getArticleBySlug("news", site.homepage.featuredNewsSlug)
    ?? null;
  const latestMatchCoverage = getLatestMatchReport();
  const heroStory = latestMatchCoverage ?? featuredNews;

  const latestPreviews = getLatestArticles("match-previews", 4);
  const latestCoverage = getLatestArticles("match-coverage", 4);
  const featuredPreviewsOrCoverage = [...latestCoverage, ...latestPreviews]
    .filter((a) => a.slug !== heroStory?.slug)
    .slice(0, 2);

  return (
    <div className="page-stack">
      <HeroSection
        description={site.homepage.heroDescription}
        leadStory={
          heroStory
            ? {
                label: latestMatchCoverage ? "Latest match report" : "Lead story",
                title: heroStory.title,
                excerpt: heroStory.excerpt,
                href: heroStory.url,
                isExternal: heroStory.isExternal,
              }
            : undefined
        }
        title={site.homepage.heroTitle}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column — Featured Articles */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {featuredPreviewsOrCoverage.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>

        {/* Right Column — Sidebar News Feed */}
        <div className="lg:col-span-1">
          <LatestNewsFeed articles={latestNews} />
        </div>
      </div>
    </div>
  );
}
