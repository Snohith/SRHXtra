import { ArticleCard } from "@/components/articles/ArticleCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getArticlesByCollection } from "@/lib/content/articles";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getItemListJsonLd } from "@/lib/seo/jsonld";

import { assertLiveFranchise, generateFranchiseStaticParams } from "@/lib/content/franchise-route";

export const metadata = buildPageMetadata({
  title: "SRH News — Squad Updates & Official Announcements",
  description: "Confirmed Sunrisers Hyderabad news for IPL 2026: squad moves, injuries and announcements.",
  path: "/sunrisers-hyderabad/news/",
});


export const dynamicParams = false;

export function generateStaticParams() {
  return generateFranchiseStaticParams();
}

export default async function NewsIndexPage({ params }: { params: Promise<{ franchise: string }> }) {
  await assertLiveFranchise(params);
  const articles = getArticlesByCollection("news");
  const featuredArticle = articles[0] ?? null;
  const remainingArticles = articles.slice(1);
  const itemListJsonLd = getItemListJsonLd(
    articles.slice(0, 20).map((article) => ({
      name: article.title,
      url: article.url,
      image: article.ogImage ?? article.coverImage,
      datePublished: article.publishedAt,
    })),
    "/sunrisers-hyderabad/news/",
  );

  return (
    <div className="page-stack">
      <h1 className="sr-only">Sunrisers Hyderabad news: squad updates and announcements</h1>
      <script
        id="news-itemlist-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {featuredArticle ? (
        <section className="section-stack">
          <SectionHeader
            title="Latest News"
          />
          <ArticleCard article={featuredArticle} variant="featured" />
        </section>
      ) : null}

      {remainingArticles.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Archive"
            title="Older Stories"
          />
          <div className="grid gap-8 md:grid-cols-2">
            {remainingArticles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      ) : null}

      {articles.length === 0 ? (
        <section className="section-stack">
          <SectionHeader
            title="Latest News"
          />
          <p className="body-copy max-w-2xl">
            No stories right now. Check back soon for squad updates and announcements.
          </p>
        </section>
      ) : null}
    </div>
  );
}
