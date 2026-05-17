import { ArticleCard } from "@/components/articles/ArticleCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getAllMatchReports } from "@/lib/content/match-coverage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH Match Coverage — Tactical Reports & Match Analysis",
  description: "Phase-by-phase tactical analysis, official match facts, and in-depth reports for every Sunrisers Hyderabad encounter in IPL 2026. Beyond the scorecard.",
  path: "/match-coverage/",
});

export default function MatchCoverageIndexPage() {
  const articles = getAllMatchReports();
  const featuredArticle = articles[0] ?? null;
  const remainingArticles = articles.slice(1);

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Matchday Archive"
        title="Tactical Reports"
        description="Tactical breakdowns, verified match facts, and editorial recaps. Matchday coverage that looks beyond the scorecard to track the campaign's turning points."
        variant="hero"
        headingLevel={1}
      />

      {featuredArticle ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="The Lead"
            title="Latest Report"
          />
          <ArticleCard article={featuredArticle} variant="featured" />
        </section>
      ) : null}

      {remainingArticles.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Archive"
            title="Previous Coverage"
          />
          <div className="grid gap-8 lg:grid-cols-2">
            {remainingArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
