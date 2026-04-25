import type { Article } from "@/lib/content/articles";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface RelatedArticlesProps {
  articles: Article[];
  description?: string;
  eyebrow?: string;
  title?: string;
}

export function RelatedArticles({
  articles,
  description = "Reports and bulletins connected by tactical themes and match context.",
  eyebrow = "Next phase",
  title = "Related reading",
}: RelatedArticlesProps) {
  if (!articles.length) {
    return null;
  }

  return (
    <section className="section-stack">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} variant="compact" />
        ))}
      </div>
    </section>
  );
}
