import Link from "next/link";
import Image from "next/image";

import type { StoryCardItem } from "@/lib/content/articles";
import { resolveArticleImage } from "@/lib/content/images";
import { formatDisplayDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { cx } from "@/lib/utils/classes";

interface ArticleCardProps {
  article: StoryCardItem;
  variant?: "default" | "compact" | "featured";
}

export function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";
  const articleImage = resolveArticleImage({
    collection: article.url.startsWith("/match-coverage/") ? "match-coverage" : "news",
    slug: article.slug,
    coverImage: article.coverImage,
    coverAlt: article.coverAlt,
    title: article.title,
  });

  return (
    <article
      className={cx(
        "premium-card",
        isFeatured ? "grid gap-0 lg:grid-cols-[1.2fr_0.8fr]" : "flex flex-col",
        isCompact && "p-4",
      )}
    >
      <div className={cx(
        "flex flex-col p-6 sm:p-8",
        isFeatured ? "order-2 lg:order-1 justify-center" : "order-2"
      )}>
        <div className="flex flex-wrap items-center gap-4">
          <Badge tone="accent">{article.category}</Badge>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/80">
            {formatDisplayDate(article.publishedAt)}
          </span>
          {article.sourceName ? (
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/80">
              {article.sourceName}
            </span>
          ) : null}
        </div>
        
        <h3 className={cx(
          "mt-5 font-black leading-[1.2] tracking-tight transition-colors group-hover:text-accent",
          isFeatured ? "text-3xl sm:text-4xl lg:text-5xl" : "text-xl sm:text-2xl"
        )}>
          <Link
            href={article.url}
            className="after:absolute after:inset-0"
            rel={article.isExternal ? "noreferrer" : undefined}
            target={article.isExternal ? "_blank" : undefined}
          >
            {article.title}
          </Link>
        </h3>
        
        <p className={cx(
          "mt-4 text-muted line-clamp-3",
          isCompact ? "text-sm" : "body-copy"
        )}>
          {article.excerpt}
        </p>
        
        {!isCompact && (
          <div className="mt-6 flex flex-wrap gap-2">
            {article.tags.slice(0, 3).map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </div>
        )}
      </div>

      {!isCompact && (
        <div
          className={cx(
            "relative overflow-hidden bg-black/20",
            isFeatured ? "order-1 aspect-[16/10] lg:order-2 lg:aspect-auto lg:h-full" : "order-1 aspect-[16/9]",
          )}
        >
          <Image
            alt={articleImage.alt}
            className={cx(
              "h-full w-full transition-transform duration-700 group-hover:scale-105",
              articleImage.fitClassName ?? "object-cover"
            )}
            height={800}
            src={articleImage.src}
            width={1200}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
      )}
    </article>
  );
}
