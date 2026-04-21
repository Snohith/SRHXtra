import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/Button";
import type { Article } from "@/lib/content/articles";
import { resolveArticleImage } from "@/lib/content/images";
import { cx } from "@/lib/utils/classes";
import { formatDisplayDate } from "@/lib/utils/date";
import { estimateReadingTime } from "@/lib/utils/text";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";

interface ArticleHeaderProps {
  article: Article;
  archiveHref: string;
  archiveLabel: string;
}

export function ArticleHeader({ article, archiveHref, archiveLabel }: ArticleHeaderProps) {
  const readingTime = estimateReadingTime(article.content);
  const articleImage = resolveArticleImage(article);

  return (
    <header className="relative flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex flex-wrap items-center gap-4">
          <Badge tone="accent">{article.category}</Badge>
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            <span>{formatDisplayDate(article.publishedAt)}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>{readingTime} min read</span>
          </div>
        </div>
        <Link href={archiveHref} className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-accent">
          ← {archiveLabel}
        </Link>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="max-w-4xl">
          <h1 className="editorial-title leading-[1.05] tracking-tighter sm:!text-6xl lg:!text-7xl xl:!text-8xl">
            {article.title}
          </h1>
          <p className="mt-8 text-xl font-medium leading-relaxed text-muted sm:text-2xl">
            {article.excerpt}
          </p>
          
          <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-white/5 pt-8">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Reported by</span>
              <span className="text-sm font-bold text-white">{article.author}</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Edition</span>
              <span className="text-sm font-bold text-white">
                {article.updatedAt ? `Updated ${formatDisplayDate(article.updatedAt)}` : "Original Publication"}
              </span>
            </div>

            {article.sourceName && article.sourceUrl ? (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Source</span>
                <a
                  className="text-sm font-bold text-orange-200 underline decoration-accent/30 underline-offset-4 transition hover:text-accent"
                  href={article.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {article.sourceName}
                </a>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border border-white/5 bg-surface/40 shadow-premium group">
          <Image
            alt={articleImage.alt}
            className={cx("h-full w-full transition-transform duration-700 group-hover:scale-105", articleImage.fitClassName ?? "object-cover")}
            height={900}
            priority
            src={articleImage.src}
            width={1200}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
      </div>
    </header>
  );
}
