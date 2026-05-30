import type { StoryCardItem } from "@/lib/content/articles";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface LatestNewsFeedProps {
  articles: StoryCardItem[];
}

export function LatestNewsFeed({ articles }: LatestNewsFeedProps) {
  return (
    <section className="section-stack">
      <SectionHeader
        title="Latest news"
        action={<Button href="/news/" variant="secondary" size="sm">See all news</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
