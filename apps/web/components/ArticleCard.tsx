import Link from "next/link";
import Image from "next/image";
import type { Article } from "@srh/contracts";
import { formatDate, resolveImageUrl } from "@/lib/api";

function Meta({ article }: { article: Article }) {
  return (
    <div className="meta">
      {article.categoryName && (
        <span className="cat">{article.categoryName}</span>
      )}
      <span>{article.authorName ?? "SRH Xtra desk"}</span>
      <time dateTime={article.publishedAt ?? undefined}>
        {formatDate(article.publishedAt)}
      </time>
    </div>
  );
}

export function ArticleCard({ article }: { article: Article }) {
  const cover = resolveImageUrl(article.coverImageUrl);
  return (
    <Link className="card" href={`/news/${article.slug}`}>
      {cover && (
        <span className="card-img">
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 560px) 100vw, (max-width: 960px) 50vw, 33vw"
          />
        </span>
      )}
      <span className="card-body">
        <Meta article={article} />
        <h3>{article.title}</h3>
        {article.excerpt && <p>{article.excerpt}</p>}
      </span>
    </Link>
  );
}

export function FeaturedStory({ article }: { article: Article }) {
  const cover = resolveImageUrl(article.coverImageUrl);
  return (
    <Link className="hero" href={`/news/${article.slug}`}>
      {cover && (
        <span className="hero-img">
          <Image
            src={cover}
            alt=""
            fill
            priority
            sizes="(max-width: 860px) 100vw, 60vw"
          />
        </span>
      )}
      <span className="hero-body">
        <Meta article={article} />
        <h2>{article.title}</h2>
        {article.excerpt && <p>{article.excerpt}</p>}
      </span>
    </Link>
  );
}

/** Latest-headlines strip linking straight to canonical article URLs. */
export function BreakingStrip({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <div className="breaking" role="region" aria-label="Latest headlines">
      <div className="breaking-inner">
        <span className="breaking-tag">LATEST</span>
        <Link href={`/news/${articles[0].slug}`}>{articles[0].title}</Link>
      </div>
    </div>
  );
}
