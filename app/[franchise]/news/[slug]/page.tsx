import { ArticleBody } from "@/components/articles/ArticleBody";
import {
  BallMap,
  BoundaryAnatomy,
  KeyNumbers,
  PullQuote,
  ResultStrip,
  SourceFooter,
  SrhLens,
  StoryTimeline,
} from "@/components/articles/MatchStoryBlocks";
import { ReadingProgress } from "@/components/articles/ReadingProgress";
import { RelatedArticles } from "@/components/articles/RelatedArticles";
import { StoryHero } from "@/components/articles/StoryHero";
import { StoryRail } from "@/components/articles/StoryRail";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getArticleBySlug, getArticleSlugs, getRelatedArticles } from "@/lib/content/articles";
import { resolveArticleImage } from "@/lib/content/images";
import { extractHeadings } from "@/lib/content/toc";
import { getArticleJsonLd, getBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

import { assertLiveFranchiseValue } from "@/lib/content/franchise-route";

export const dynamicParams = false;

const MATCH_STORY_SLUG = "abhishek-sharma-82-ishan-kishan-42-afghanistan-t20i-2026";

const MATCH_STORY_TOC = [
  { id: "key-numbers", text: "Key numbers" },
  { id: "boundary-anatomy", text: "Where the 82 came from" },
  { id: "ball-map", text: "Ball-by-ball map" },
  { id: "pull-quote", text: "What he said" },
  { id: "how-it-happened", text: "How it happened" },
  { id: "srh-lens", text: "What it means for Hyderabad" },
];

export function generateStaticParams() {
  return getArticleSlugs("news").map((slug) => ({ franchise: "sunrisers-hyderabad", slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ franchise: string; slug: string }>;
}) {
  const { franchise, slug } = await params;
  assertLiveFranchiseValue(franchise);
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

function splitSourceNote(content: string) {
  const parts = content.split(/^##\s+Source note/im);
  if (parts.length < 2) return { main: content, source: null as string | null };
  return { main: parts[0].trimEnd(), source: `## Source note\n${parts.slice(1).join("## Source note").trim()}` };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ franchise: string; slug: string }>;
}) {
  const { franchise, slug } = await params;
  assertLiveFranchiseValue(franchise);
  const article = getArticleBySlug("news", slug);

  if (!article) {
    throw new Error(`Missing news article for slug: ${slug}`);
  }

  const relatedArticles = getRelatedArticles(article);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "News", href: "/sunrisers-hyderabad/news/" },
    { label: article.title },
  ];
  const jsonLd = [getBreadcrumbJsonLd(breadcrumbItems.map(({ label, href }) => ({ name: label, url: href ?? article.url }))), getArticleJsonLd(article)];

  const isMatchStory = article.slug === MATCH_STORY_SLUG;
  const { main, source } = isMatchStory
    ? splitSourceNote(article.content)
    : { main: article.content, source: null as string | null };
  const railToc = isMatchStory
    ? [...extractHeadings(main).map(({ id, text }) => ({ id, text })), ...MATCH_STORY_TOC]
    : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-8 sm:gap-12 lg:gap-16">
      <script
        id={`news-jsonld-${article.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgress />
      <div className="section-stack">
        <Breadcrumbs items={breadcrumbItems} />
        <StoryHero article={article} archiveHref="/sunrisers-hyderabad/news/" archiveLabel="Back to news" />
      </div>

      {isMatchStory ? <ResultStrip /> : null}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {isMatchStory ? (
          <div className="grid min-w-0 gap-6 sm:gap-8">
            <KeyNumbers />
            <ArticleBody content={main} dropCap />
            <PullQuote />
            <BoundaryAnatomy />
            <BallMap />
            <StoryTimeline />
            <SrhLens />
            {source ? <ArticleBody content={source} dropCap={false} /> : null}
            <SourceFooter sourceName={article.sourceName} sourceUrl={article.sourceUrl} />
          </div>
        ) : (
          <ArticleBody content={article.content} />
        )}
        <StoryRail article={article} toc={railToc} />
      </div>
      <RelatedArticles articles={relatedArticles} />
    </div>
  );
}
