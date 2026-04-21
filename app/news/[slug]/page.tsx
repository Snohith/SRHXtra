import Link from "next/link";

import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleHeader } from "@/components/articles/ArticleHeader";
import { RelatedArticles } from "@/components/articles/RelatedArticles";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getArticleBySlug, getArticleSlugs, getRelatedArticles } from "@/lib/content/articles";
import { resolveArticleImage } from "@/lib/content/images";
import { getArticleJsonLd, getBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return getArticleSlugs("news").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug("news", slug);

  if (!article) {
    return {};
  }

  const articleImage = resolveArticleImage(article);

  return buildPageMetadata({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt,
    path: article.url,
    image: article.ogImage ?? articleImage.src,
    type: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt ?? article.publishedAt,
    authors: [article.author],
    section: article.category,
    tags: article.tags,
  });
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug("news", slug);

  if (!article) {
    throw new Error(`Missing news article for slug: ${slug}`);
  }

  const relatedArticles = getRelatedArticles(article);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "News", href: "/news/" },
    { label: article.title },
  ];
  const jsonLd = [getBreadcrumbJsonLd(breadcrumbItems.map(({ label, href }) => ({ name: label, url: href ?? article.url }))), getArticleJsonLd(article)];

  return (
    <div className="page-stack">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <Breadcrumbs items={breadcrumbItems} />
      <ArticleHeader article={article} archiveHref="/news/" archiveLabel="Back to news" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ArticleBody content={article.content} />
        <aside className="section-stack">
          <div className="story-rail-card">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Story context</p>
            <p className="mt-3 text-base font-semibold text-white">News desk</p>
            <p className="mt-2 story-caption">
              The news desk tracks off-field SRH developments only. Match reports and recaps live in the match-coverage archive.
            </p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-accent" href="/news/">
              Browse the full desk
            </Link>
          </div>
        </aside>
      </div>
      <RelatedArticles articles={relatedArticles} />
    </div>
  );
}
