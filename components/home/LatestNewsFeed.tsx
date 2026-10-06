import Link from "next/link";
import type { StoryCardItem } from "@/lib/content/articles";
import { Button } from "@/components/ui/Button";
import { formatDisplayDate } from "@/lib/utils/date";

interface LatestNewsFeedProps {
  articles: StoryCardItem[];
}

export function LatestNewsFeed({ articles }: LatestNewsFeedProps) {
  return (
    <aside className="glass-panel p-6 sm:p-8 flex flex-col h-full min-w-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-4 mb-4">
        <h2 className="min-w-0 break-words text-lg font-black uppercase tracking-tight text-foreground sm:text-xl">
          Latest News
        </h2>
        <Button href="/sunrisers-hyderabad/news/" variant="ghost" size="sm" className="px-3 py-1.5 text-[10px]">
          See all
        </Button>
      </div>
      <div className="flex-1 divide-y divide-border">
        {articles.length === 0 ? (
          <p className="py-4 text-sm font-medium text-muted">
            No stories yet.
          </p>
        ) : null}
        {articles.slice(0, 5).map((article) => (
          <div key={article.slug} className="py-4 first:pt-0 last:pb-0">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent">
              {formatDisplayDate(article.publishedAt)}
            </span>
            <h3 className="mt-1.5 text-sm font-black uppercase tracking-tight leading-snug hover:text-accent transition-colors">
              <Link href={article.url} className="line-clamp-2">
                {article.title}
              </Link>
            </h3>
          </div>
        ))}
      </div>
    </aside>
  );
}
