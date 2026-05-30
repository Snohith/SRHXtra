import { HeroSection } from "@/components/home/HeroSection";
import { getArticleBySlug, getLatestArticles } from "@/lib/content/articles";
import { getLatestMatchReport } from "@/lib/content/match-coverage";
import { getSiteConfig } from "@/lib/content/site";
import { buildPageMetadata } from "@/lib/seo/metadata";




export const metadata = buildPageMetadata({
  title: "Sunrisers Hyderabad News, Match Reports & IPL 2026 Coverage",
  description: "The premier independent destination for Sunrisers Hyderabad supporters. Featuring sharper match coverage, tactical analysis, official squad updates, and immersive photo galleries for the Orange Army.",
  path: "/",
});

export default function HomePage() {
  const site = getSiteConfig();
  const latestNews = getLatestArticles("news", 4);
  const featuredNews =
    latestNews[0]
    ?? getArticleBySlug("news", site.homepage.featuredNewsSlug)
    ?? null;
  const latestMatchCoverage = getLatestMatchReport();
  const heroStory = latestMatchCoverage ?? featuredNews;

  return (
    <div className="page-stack">
      <HeroSection
        description={site.homepage.heroDescription}
        image="/images/site/homepage-hero.png"
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
    </div>
  );
}
