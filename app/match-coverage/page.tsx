import { ArticleCard } from "@/components/articles/ArticleCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getArticlesByCollection } from "@/lib/content/articles";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Match Coverage",
  path: "/match-coverage/",
});

export default function MatchCoverageIndexPage() {
  const articles = getArticlesByCollection("match-coverage");
  const featuredArticle = articles[0] ?? null;
  const remainingArticles = articles.slice(1);

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Matchday Archive"
        title="Tactical Reports"
        description="Phase-by-phase tactical analysis, verified match facts, and official score summaries. Our match coverage goes beyond the numbers to tell the real story of every SRH encounter."
        variant="hero"
      />

      {featuredArticle ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Latest Analysis"
            title="Recent Encounter"
          />
          <ArticleCard article={featuredArticle} variant="featured" />
        </section>
      ) : null}

      {remainingArticles.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Archive desk"
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
