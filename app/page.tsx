import { AlbumGrid } from "@/components/gallery/AlbumGrid";
import { FeaturedStory } from "@/components/home/FeaturedStory";
import { HeroSection } from "@/components/home/HeroSection";
import { LatestNewsFeed } from "@/components/home/LatestNewsFeed";
import { MatchWidget } from "@/components/home/MatchWidget";
import { PointsTableTeaser } from "@/components/home/PointsTableTeaser";
import { SquadSpotlight } from "@/components/home/SquadSpotlight";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getArticleBySlug, getLatestArticles } from "@/lib/content/articles";
import { getAllGalleryAlbums } from "@/lib/content/gallery";
import { resolveArticleImage } from "@/lib/content/images";
import { getPointsTable } from "@/lib/content/points-table";
import { getLatestCompletedFixture, getNextFixture } from "@/lib/content/schedule";
import { getSiteConfig } from "@/lib/content/site";
import { getSquadSpotlightPlayer } from "@/lib/content/squad";
import { buildPageMetadata } from "@/lib/seo/metadata";

const site = getSiteConfig();

export const metadata = buildPageMetadata({
  title: site.defaultTitle,
  description: site.defaultDescription,
  path: "/",
});

export default function HomePage() {
  const latestNews = getLatestArticles("news", 4);
  const featuredNews =
    latestNews[0]
    ?? getArticleBySlug("news", site.homepage.featuredNewsSlug)
    ?? null;
  const secondaryFeature = latestNews.find((article) => article.url !== featuredNews?.url) ?? null;
  const newsFeedArticles = latestNews.filter((article) => article.url !== featuredNews?.url).slice(0, 2);
  const latestMatchCoverage = getLatestArticles("match-coverage", 1)[0] ?? null;
  const nextFixture = getNextFixture();
  const latestResult = getLatestCompletedFixture();
  const pointsTable = getPointsTable();
  const squadSpotlight = getSquadSpotlightPlayer();
  const latestGallery = getAllGalleryAlbums().slice(0, 2);

  const featuredImage = featuredNews ? resolveArticleImage(featuredNews) : null;

  return (
    <div className="page-stack">
      <HeroSection
        description={site.homepage.heroDescription}
        image={featuredImage?.src}
        leadStory={
          featuredNews
            ? {
                label: "Lead story",
                title: featuredNews.title,
                excerpt: featuredNews.excerpt,
                href: featuredNews.url,
                isExternal: featuredNews.isExternal,
              }
            : undefined
        }
        title={site.homepage.heroTitle}
      />

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="section-stack">
          <SectionHeader
            eyebrow="The Lead"
            title="Editorial Focus"
            description="Deep dives into the latest tactical shifts, injury updates, and strategic moves from the SRH camp."
          />
          <FeaturedStory article={secondaryFeature} />
        </div>
        <div className="section-stack">
          <MatchWidget latestResult={latestResult} nextFixture={nextFixture} />
          <SquadSpotlight player={squadSpotlight} />
        </div>
      </section>

      <section className="section-stack">
        <SectionHeader
          eyebrow="News Ticker"
          title="Latest Bulletins"
          description="Real-time updates and quick reads on everything Sunrisers."
          action={
            <Button href="/news/" size="sm" variant="secondary">
              View all news
            </Button>
          }
        />
        <LatestNewsFeed articles={newsFeedArticles} />
      </section>

      <section className="grid gap-12 xl:grid-cols-[1fr_1fr]">
        <section className="section-stack">
          <SectionHeader
            eyebrow="Matchday"
            title="Detailed Reports"
            description="Clinical analysis and turning points from SRH's most recent encounters."
            action={
              <Button href="/match-coverage/" size="sm" variant="outline">
                Archive
              </Button>
            }
          />
          {latestMatchCoverage ? (
            <ArticleCard article={latestMatchCoverage} variant="featured" />
          ) : (
            <div className="glass-panel p-10 text-center text-sm text-muted">
              Match coverage will appear here as reports are added.
            </div>
          )}
        </section>

        <PointsTableTeaser table={pointsTable} />
      </section>

      <section className="section-stack">
        <SectionHeader
          eyebrow="Visuals"
          title="The Gallery"
          description="High-definition visual storytelling from match nights and the orange faithful."
          action={
            <Button href="/gallery/" size="sm" variant="outline">
              Full Archive
            </Button>
          }
        />
        <AlbumGrid albums={latestGallery} />
      </section>
    </div>
  );
}
