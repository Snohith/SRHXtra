import Link from "next/link";
import Script from "next/script";

import { ArticleBody } from "@/components/articles/ArticleBody";
import { ArticleHeader } from "@/components/articles/ArticleHeader";
import { RelatedArticles } from "@/components/articles/RelatedArticles";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getArticleBySlug, getArticleSlugs, getRelatedArticles } from "@/lib/content/articles";
import { getGalleryAlbumForReportSlug, resolveArticleImage } from "@/lib/content/images";
import { getArticleJsonLd, getBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

import { assertLiveFranchiseValue } from "@/lib/content/franchise-route";

export const dynamicParams = false;

export function generateStaticParams() {
  return getArticleSlugs("match-coverage").map((slug) => ({ franchise: "sunrisers-hyderabad", slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ franchise: string; slug: string }>;
}) {
  const { franchise, slug } = await params;
  assertLiveFranchiseValue(franchise);
  const article = getArticleBySlug("match-coverage", slug);

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

export default async function MatchCoverageArticlePage({
  params,
}: {
  params: Promise<{ franchise: string; slug: string }>;
}) {
  const { franchise, slug } = await params;
  assertLiveFranchiseValue(franchise);
  const article = getArticleBySlug("match-coverage", slug);

  if (!article) {
    throw new Error(`Missing match coverage article for slug: ${slug}`);
  }

  const relatedArticles = getRelatedArticles(article);
  const relatedGalleryAlbum = getGalleryAlbumForReportSlug(article.slug);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Match Coverage", href: "/sunrisers-hyderabad/match-coverage/" },
    { label: article.title },
  ];
  const jsonLd = [getBreadcrumbJsonLd(breadcrumbItems.map(({ label, href }) => ({ name: label, url: href ?? article.url }))), getArticleJsonLd(article)];

  return (
    <div className="page-stack">
      <script
        id={`match-coverage-jsonld-${article.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="section-stack">
        <Breadcrumbs items={breadcrumbItems} />
        <ArticleHeader article={article} archiveHref="/sunrisers-hyderabad/match-coverage/" archiveLabel="Back to coverage" />
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ArticleBody content={article.content} />
        <aside className="section-stack min-w-0">
          <div className="story-surface !p-6 sm:!p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Archive</p>
            <p className="mt-3 text-base font-semibold text-foreground">Other games</p>
            <p className="mt-2 story-caption">
              Every game has its own report. Jump between them, or check the full fixture list.
            </p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-accent" href="/sunrisers-hyderabad/schedule/">
              Full schedule
            </Link>
            {relatedGalleryAlbum ? (
              <Link className="mt-3 inline-flex text-sm font-semibold text-accent" href={relatedGalleryAlbum.url}>
                Related photos
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
      <RelatedArticles articles={relatedArticles} />
    </div>
  );
}
