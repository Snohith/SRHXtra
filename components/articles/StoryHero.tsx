import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import type { Article } from "@/lib/content/articles";
import { resolveArticleImage } from "@/lib/content/images";
import { cx } from "@/lib/utils/classes";
import { formatDisplayDate } from "@/lib/utils/date";
import { estimateReadingTime } from "@/lib/utils/text";

interface StoryHeroProps {
  article: Article;
  archiveHref: string;
  archiveLabel: string;
}

export function StoryHero({ article, archiveHref, archiveLabel }: StoryHeroProps) {
  const readingTime = estimateReadingTime(article.content);
  const articleImage = resolveArticleImage(article);
  const initials = article.author
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("");

  return (
    <header className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Badge tone="accent">{article.category}</Badge>
          <span className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            <time dateTime={article.publishedAt}>{formatDisplayDate(article.publishedAt)}</time>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-border-strong" />
            <span>{readingTime} min read</span>
          </span>
        </div>
        <Link
          href={archiveHref}
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted transition-colors hover:text-accent"
        >
          ← {archiveLabel}
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <h1 className="text-balance text-4xl font-black leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          {article.title}
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg font-medium leading-relaxed text-muted sm:mt-8 sm:text-2xl">
          {article.excerpt}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-5 border-y border-border py-6 sm:mt-10">
          <span className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-sm font-black text-white"
            >
              {initials}
            </span>
            <span className="flex flex-col items-start gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                Reported by
              </span>
              <span className="text-sm font-bold text-foreground">{article.author}</span>
            </span>
          </span>
          <span className="hidden h-10 w-px bg-border sm:block" aria-hidden="true" />
          <span className="flex flex-col items-start gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Edition
            </span>
            <span className="text-sm font-bold text-foreground">
              {article.updatedAt
                ? `Updated ${formatDisplayDate(article.updatedAt)}`
                : "Original publication"}
            </span>
          </span>
          {article.sourceName && article.sourceUrl ? (
            <>
              <span className="hidden h-10 w-px bg-border sm:block" aria-hidden="true" />
              <span className="flex flex-col items-start gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  Source
                </span>
                <a
                  className="text-sm font-bold text-accent underline decoration-accent/30 underline-offset-4 transition hover:text-accent/80"
                  href={article.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {article.sourceName}
                </a>
              </span>
            </>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {article.tags.map((tag) => (
            <Tag key={tag} label={tag} />
          ))}
        </div>
      </div>

      <figure className="group relative overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-premium sm:rounded-[2.5rem]">
        <Image
          alt={articleImage.alt}
          className={cx(
            "aspect-[16/10] w-full transition-transform duration-700 group-hover:scale-[1.02] sm:aspect-[21/9]",
            articleImage.fitClassName ?? "object-cover",
          )}
          height={900}
          priority
          sizes="(max-width: 896px) 100vw, 896px"
          src={articleImage.src}
          width={1600}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"
        />
        <figcaption className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 px-6 py-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 sm:px-10 sm:py-6">
          <span className="line-clamp-1">{articleImage.alt}</span>
          {article.sourceName ? <span className="shrink-0">© {article.sourceName}</span> : null}
        </figcaption>
      </figure>
    </header>
  );
}
