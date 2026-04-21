import { ArticleCard } from "@/components/articles/ArticleCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getArticlesByCollection } from "@/lib/content/articles";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH News — Squad Updates & Official Announcements",
  description: "Official Sunrisers Hyderabad news covering squad changes, injury replacements, captaincy announcements, and player availability updates for the IPL 2026 campaign.",
  path: "/news/",
});

export default function NewsIndexPage() {
  const articles = getArticlesByCollection("news");
  const featuredArticle = articles[0] ?? null;
  const remainingArticles = articles.slice(1);

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="News Desk"
        title="Editorial Bulletins"
        description="Official roster updates, injury reports, and executive announcements from the Sunrisers camp. Our analytical coverage ensures you stay ahead of every tactical move."
        variant="hero"
      />

      {featuredArticle ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Featured Edition"
            title="Today's Lead Story"
          />
          <ArticleCard article={featuredArticle} variant="featured" />
        </section>
      ) : null}

      {remainingArticles.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Archive Feed"
            title="Latest Bulletins"
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
