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

export const dynamicParams = false;

export function generateStaticParams() {
  return getArticleSlugs("match-coverage").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug("match-coverage", slug);

  if (!article) {
    throw new Error(`Missing match coverage article for slug: ${slug}`);
  }

  const relatedArticles = getRelatedArticles(article);
  const relatedGalleryAlbum = getGalleryAlbumForReportSlug(article.slug);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Match Coverage", href: "/match-coverage/" },
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
      <Breadcrumbs items={breadcrumbItems} />
      <ArticleHeader article={article} archiveHref="/match-coverage/" archiveLabel="Back to coverage" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <ArticleBody content={article.content} />
        <aside className="section-stack">
          <div className="story-rail-card">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Matchday archive</p>
            <p className="mt-3 text-base font-semibold text-foreground">Coverage context</p>
            <p className="mt-2 story-caption">
              Use the match archive to move between reports, momentum swings, and linked fixtures.
            </p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-accent" href="/schedule/">
              Open season schedule
            </Link>
            {relatedGalleryAlbum ? (
              <Link className="mt-3 inline-flex text-sm font-semibold text-accent" href={relatedGalleryAlbum.url}>
                Open related gallery
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
      <RelatedArticles articles={relatedArticles} />
    </div>
  );
}
