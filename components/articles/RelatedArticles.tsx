import type { Article } from "@/lib/content/articles";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface RelatedArticlesProps {
  articles: Article[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (!articles.length) {
    return null;
  }

  return (
    <section className="section-stack">
      <SectionHeader
        eyebrow="Continue reading"
        title="Related coverage"
        description="Stories connected by match context, themes, and editorial tags."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} variant="compact" />
        ))}
      </div>
    </section>
  );
}

