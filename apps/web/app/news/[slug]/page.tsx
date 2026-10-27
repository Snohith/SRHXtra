import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import ArticleViewTracker from "@/components/ArticleViewTracker";
import ReadingProgress from "@/components/ReadingProgress";
import ShareRow from "@/components/ShareRow";
import {
  articleUrl,
  formatDateTime,
  getArticle,
  getFeed,
  resolveImageUrl,
} from "@/lib/api";
import { serializeJsonLd } from "@/lib/jsonld";
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Story not found" };
  // SEO overrides (admin panel) take priority; fall back to headline/summary.
  const metaTitle = article.seoTitle?.trim() || article.title;
  const description =
    article.seoDescription?.trim() ||
    article.excerpt?.trim() ||
    textExcerpt(article.body);
  const url = articleUrl(article.slug);
  // Cover if uploaded; otherwise the generated per-article OG route (Step 5).
  const ogImage =
    resolveImageUrl(article.coverImageUrl) ??
    `/news/${article.slug}/opengraph-image`;
  return {
    title: metaTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "SRH Xtra",
      title: metaTitle,
      description,
      publishedTime: article.publishedAt ?? undefined,
      authors: article.authorName ? [article.authorName] : undefined,
      images: [{ url: ogImage, alt: metaTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  // An old published slug resolves to the article's current slug: send readers
  // and crawlers to the canonical URL instead of rendering a duplicate page.
  if (article.slug !== slug) redirect(`/news/${article.slug}`);

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
    author: { "@type": "Person", name: article.authorName ?? "SRH Xtra desk" },
    ...(cover ? { image: [cover] } : {}),
    mainEntityOfPage: articleUrl(article.slug),
  };

  return (
    <div className="wrap">
      <ReadingProgress />
      <ArticleViewTracker
        slug={article.slug}
        title={article.title}
        category={article.categoryName}
        author={article.authorName}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
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
        <header className="article-head" data-reveal="">
          {article.categoryName && (
            <span className="cat">{article.categoryName}</span>
          )}
          <h1>{article.title}</h1>
          {article.excerpt && <p className="standfirst">{article.excerpt}</p>}
          <div className="meta">
            <span>By {article.authorName ?? "SRH Xtra desk"}</span>
            <time dateTime={article.publishedAt ?? undefined}>
              {formatDateTime(article.publishedAt)}
            </time>
          </div>
        </header>
        <div className="article-share">
          <ShareRow url={articleUrl(article.slug)} title={article.title} />
        </div>
        {cover && (
          <div className="hero-single" data-reveal="" data-parallax="16">
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
          data-reveal=""
          dangerouslySetInnerHTML={{ __html: cleanBody }}
        />
      </article>
      <div className="article-share article-share-end" data-reveal="">
        <ShareRow url={articleUrl(article.slug)} title={article.title} />
      </div>
      {related.length > 0 && (
        <section className="section" aria-label="Related stories">
          <div className="section-head" data-reveal="">
            <h2>Related stories</h2>
            {article.categorySlug && (
              <Link href={`/news?category=${article.categorySlug}`}>
                More →
              </Link>
            )}
          </div>
          <div className="cards">
            {related.map((a, i) => (
              <ArticleCard key={a.id} article={a} revealDelay={(i % 3) * 60} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
