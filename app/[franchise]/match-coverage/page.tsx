import { ArticleCard } from "@/components/articles/ArticleCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getAllMatchReports } from "@/lib/content/match-coverage";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getItemListJsonLd } from "@/lib/seo/jsonld";

import { assertLiveFranchise, generateFranchiseStaticParams } from "@/lib/content/franchise-route";

export const metadata = buildPageMetadata({
  title: "SRH Match Coverage — Reports on Every 2026 Game",
  description: "What decided each Sunrisers Hyderabad game in IPL 2026, written up after the match.",
  path: "/sunrisers-hyderabad/match-coverage/",
});


export const dynamicParams = false;

export function generateStaticParams() {
  return generateFranchiseStaticParams();
}

export default async function MatchCoverageIndexPage({ params }: { params: Promise<{ franchise: string }> }) {
  await assertLiveFranchise(params);
  const articles = getAllMatchReports();
  const featuredArticle = articles[0] ?? null;
  const remainingArticles = articles.slice(1);
  const itemListJsonLd = getItemListJsonLd(
    articles.slice(0, 20).map((article) => ({
      name: article.title,
      url: article.url,
      image: article.ogImage ?? article.coverImage,
      datePublished: article.publishedAt,
    })),
    "/sunrisers-hyderabad/match-coverage/",
  );

  return (
    <div className="page-stack">
      <h1 className="sr-only">SRH match reports and tactical coverage</h1>
      <script
        id="match-coverage-itemlist-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {featuredArticle ? (
        <section className="section-stack">
          <SectionHeader
            title="Latest Report"
          />
          <ArticleCard article={featuredArticle} variant="featured" />
        </section>
      ) : null}

      {remainingArticles.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Archive"
            title="Older Reports"
          />
          <div className="grid gap-8 md:grid-cols-2">
            {remainingArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
