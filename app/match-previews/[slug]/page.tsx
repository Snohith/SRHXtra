import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleHeader } from "@/components/articles/ArticleHeader";
import { RelatedArticles } from "@/components/articles/RelatedArticles";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import {
  getMatchPreviewBySlug,
  getMatchPreviewSourceSlugs,
  getRelatedMatchPreviews,
} from "@/lib/content/match-previews";
import { resolveArticleImage } from "@/lib/content/images";
import { getArticleJsonLd, getBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return getMatchPreviewSourceSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getMatchPreviewBySlug(slug);

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

export default async function MatchPreviewArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getMatchPreviewBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedMatchPreviews(article);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Match Previews", href: "/match-previews/" },
    { label: article.title },
  ];
  const jsonLd = [
    getBreadcrumbJsonLd(breadcrumbItems.map(({ label, href }) => ({ name: label, url: href ?? article.url }))),
    getArticleJsonLd(article),
  ];

  return (
    <div className="page-stack">
      <script
        id={`match-preview-jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs items={breadcrumbItems} />
      <ArticleHeader article={article} archiveHref="/match-previews/" archiveLabel="Back to previews" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ArticleBody content={article.content} />
        <aside className="section-stack">
          <div className="story-rail-card">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Preview Desk</p>
            <p className="mt-3 text-base font-semibold text-foreground">Before the toss</p>
            <p className="mt-2 story-caption">
              Match Previews are written as pre-match reads: fixture context, matchup questions, and selection notes without post-result framing.
            </p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-accent" href="/schedule/">
              View fixture list
            </Link>
            <Link className="mt-3 inline-flex text-sm font-semibold text-accent" href="/points-table/">
              Check points table
            </Link>
          </div>
        </aside>
      </div>
      <RelatedArticles
        articles={relatedArticles}
        title="Related previews"
      />
    </div>
  );
}
