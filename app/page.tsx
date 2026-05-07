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
import { getLatestMatchPreviews } from "@/lib/content/match-previews";
import { getPointsTable } from "@/lib/content/points-table";
import { getLatestCompletedFixture, getNextFixture } from "@/lib/content/schedule";
import { getSiteConfig } from "@/lib/content/site";
import { getSquadSpotlightPlayer } from "@/lib/content/squad";
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
  const secondaryFeature = latestNews.find((article) => article.url !== featuredNews?.url) ?? null;
  const newsFeedArticles = latestNews.slice(0, 2);
  const latestMatchCoverage = getLatestArticles("match-coverage", 1)[0] ?? null;
  const latestMatchPreview = getLatestMatchPreviews(1)[0] ?? null;
  const heroStory = latestMatchCoverage ?? featuredNews;
  const nextFixture = getNextFixture();
  const latestResult = getLatestCompletedFixture();
  const pointsTable = getPointsTable();
  const squadSpotlight = getSquadSpotlightPlayer();
  const latestGallery = getAllGalleryAlbums().slice(0, 2);

  const featuredImage = site.homepage.heroImage 
    ? { src: site.homepage.heroImage } 
    : (heroStory ? resolveArticleImage(heroStory) : null);

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

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="section-stack">
          <SectionHeader
            eyebrow="The Lead"
            title="Editorial Focus"
            description="Focused reporting on squad moves, tactical shifts, and developments from the ground."
          />
          <FeaturedStory article={secondaryFeature} />
        </div>
        <div className="section-stack">
          <MatchWidget latestResult={latestResult} nextFixture={nextFixture} />
          {latestMatchPreview ? (
            <div className="story-rail-card">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Preview Desk</p>
              <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">
                {latestMatchPreview.title}
              </h2>
              <p className="mt-3 story-caption">{latestMatchPreview.excerpt}</p>
              <Button href={latestMatchPreview.url} size="sm" variant="outline" className="mt-5">
                Read scouting note
              </Button>
            </div>
          ) : null}
          <SquadSpotlight player={squadSpotlight} />
        </div>
      </section>

      <section className="section-stack">
        <SectionHeader
          eyebrow="News Feed"
          title="Latest Updates"
          description="Fast, editorial updates on squad movements and announcements."
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
            title="Match Archive"
            description="Reports and tactical breakdowns from the season's encounters."
            action={
              <Button href="/match-coverage/" size="sm" variant="outline">
                All Reports
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
          eyebrow="Captured"
          title="The Gallery"
          description="Match-night frames from the ground and the stands."
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
