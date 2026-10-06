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

function getCollectionFromUrl(url: string) {
  if (url.startsWith("/sunrisers-hyderabad/match-coverage/")) return "match-coverage";
  if (url.startsWith("/sunrisers-hyderabad/match-previews/")) return "match-previews";
  return "news";
}

export function ArticleCard({ article, variant = "default" }: ArticleCardProps) {
  const isFeatured = variant === "featured";
  const isCompact = variant === "compact";
  const articleImage = resolveArticleImage({
    collection: getCollectionFromUrl(article.url),
    slug: article.slug,
    coverImage: article.coverImage,
    coverAlt: article.coverAlt,
    title: article.title,
  });

  return (
    <article
      itemScope
      itemType="https://schema.org/Article"
      className={cx(
        "premium-card group",
        isFeatured ? "grid gap-0 lg:grid-cols-[1.2fr_0.8fr]" : "flex flex-col",
        isCompact && "p-4",
      )}
    >
      <div className={cx(
        "flex flex-col p-5 sm:p-7 lg:p-8",
        isFeatured ? "order-2 lg:order-1 justify-center" : "order-2"
      )}>
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
          <Badge tone="accent">{article.category}</Badge>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/80">
            <time dateTime={article.publishedAt} itemProp="datePublished">
              {formatDisplayDate(article.publishedAt)}
            </time>
          </span>
          {article.sourceName ? (
            <span itemProp="publisher" itemScope itemType="https://schema.org/Organization" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/80">
              <span itemProp="name">{article.sourceName}</span>
            </span>
          ) : null}
        </div>
        
        <h3 
          itemProp="headline"
          className={cx(
            "mt-4 font-black leading-[1.15] tracking-tight transition-colors group-hover:text-accent sm:mt-5",
            isFeatured ? "text-2xl sm:text-4xl lg:text-5xl" : "text-lg sm:text-2xl"
          )}
        >
          <Link
            href={article.url}
            itemProp="url"
            className="after:absolute after:inset-0"
            rel={article.isExternal ? "noreferrer" : undefined}
            target={article.isExternal ? "_blank" : undefined}
          >
            {article.title}
          </Link>
        </h3>
        
        <p 
          itemProp="description"
          className={cx(
            "mt-4 text-muted line-clamp-3",
            isCompact ? "text-sm" : "body-copy"
          )}
        >
          {article.excerpt}
        </p>
        
        {!isCompact && (
          <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
            {article.tags.slice(0, 3).map((tag) => (
              <Tag key={tag} label={tag} />
            ))}
          </div>
        )}
      </div>

      {!isCompact && (
        <div
          className={cx(
            "relative overflow-hidden bg-surface-strong",
            isFeatured ? "order-1 aspect-[16/10] lg:order-2 lg:aspect-auto lg:h-full" : "order-1 aspect-[16/9]",
          )}
        >
          <Image
            alt={articleImage.alt}
            itemProp="image"
            className={cx(
              "h-full w-full transition-transform duration-700 group-hover:scale-105",
              articleImage.fitClassName ?? "object-cover"
            )}
            height={800}
            sizes={isFeatured ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            src={articleImage.src}
            width={1200}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
      )}
    </article>
  );
}
