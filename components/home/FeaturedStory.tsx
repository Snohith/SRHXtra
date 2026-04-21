import type { StoryCardItem } from "@/lib/content/articles";
import { ArticleCard } from "@/components/articles/ArticleCard";

interface FeaturedStoryProps {
  article: StoryCardItem | null;
}

export function FeaturedStory({ article }: FeaturedStoryProps) {
  if (!article) {
    return null;
  }

  return <ArticleCard article={article} variant="featured" />;
}
