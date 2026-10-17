import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import {
  articleUrl,
  formatDateTime,
  getArticle,
  getFeed,
  resolveImageUrl,
} from "@/lib/api";
import { sanitizeBody, textExcerpt } from "@/lib/sanitize";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const feed = await getFeed({ page: 1, pageSize: 50 });
    return feed.data.map((a) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const article = await getArticle(params.slug);
  if (!article) return { title: "Story not found" };
  const description = article.excerpt?.trim() || textExcerpt(article.body);
  const url = articleUrl(article.slug);
  // Cover if uploaded; otherwise the generated per-article OG route (Step 5).
  const ogImage =
    resolveImageUrl(article.coverImageUrl) ??
    `/news/${article.slug}/opengraph-image`;
  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "SRH News",
      title: article.title,
      description,
      publishedTime: article.publishedAt ?? undefined,
      authors: article.authorName ? [article.authorName] : undefined,
      images: [{ url: ogImage, alt: article.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticle(params.slug);
  if (!article) notFound();

  const related = article.categorySlug
    ? (
        await getFeed({ page: 1, pageSize: 4, category: article.categorySlug })
      ).data
        .filter((a) => a.id !== article.id)
        .slice(0, 3)
    : [];

  const cover = resolveImageUrl(article.coverImageUrl);
  const cleanBody = sanitizeBody(article.body);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt ?? textExcerpt(article.body),
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Person", name: article.authorName ?? "SRH News desk" },
    ...(cover ? { image: [cover] } : {}),
    mainEntityOfPage: articleUrl(article.slug),
  };

  return (
    <div className="wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="meta" aria-label="Breadcrumb" style={{ marginBottom: 4 }}>
        <Link href="/">Home</Link> · <Link href="/news">News</Link>
        {article.categorySlug && (
          <>
            {" "}
            ·{" "}
            <Link href={`/news?category=${article.categorySlug}`}>
              {article.categoryName}
            </Link>
          </>
        )}
      </nav>
      <article>
        <header className="article-head">
          {article.categoryName && (
            <span className="cat">{article.categoryName}</span>
          )}
          <h1>{article.title}</h1>
          {article.excerpt && <p className="standfirst">{article.excerpt}</p>}
          <div className="meta">
            <span>By {article.authorName ?? "SRH News desk"}</span>
            <time dateTime={article.publishedAt ?? undefined}>
              {formatDateTime(article.publishedAt)}
            </time>
          </div>
        </header>
        {cover && (
          <div className="hero-single">
            <Image
              src={cover}
              alt={article.title}
              fill
              priority
              sizes="(max-width: 960px) 100vw, 960px"
            />
          </div>
        )}
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: cleanBody }}
        />
      </article>
      {related.length > 0 && (
        <section className="section" aria-label="Related stories">
          <div className="section-head">
            <h2>Related stories</h2>
            {article.categorySlug && (
              <Link href={`/news?category=${article.categorySlug}`}>
                More →
              </Link>
            )}
          </div>
          <div className="cards">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
