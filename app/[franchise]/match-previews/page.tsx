import { ArticleCard } from "@/components/articles/ArticleCard";
import { NextMatchPreviewCard } from "@/components/articles/NextMatchPreviewCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getArchivedMatchPreviews, getNextMatchPreviewFeature } from "@/lib/content/match-previews";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getItemListJsonLd } from "@/lib/seo/jsonld";

import { assertLiveFranchise, generateFranchiseStaticParams } from "@/lib/content/franchise-route";

export const metadata = buildPageMetadata({
  title: "SRH Match Previews — What to Watch Before the Toss",
  description: "Short previews before each Sunrisers Hyderabad game: matchups and selection questions for IPL 2026.",
  path: "/sunrisers-hyderabad/match-previews/",
});


export const dynamicParams = false;

export function generateStaticParams() {
  return generateFranchiseStaticParams();
}

export default async function MatchPreviewsIndexPage({ params }: { params: Promise<{ franchise: string }> }) {
  await assertLiveFranchise(params);
  const featuredPreview = getNextMatchPreviewFeature();
  const remainingPreviews = getArchivedMatchPreviews();
  const itemListJsonLd = getItemListJsonLd(
    remainingPreviews.slice(0, 20).map((article) => ({
      name: article.title,
      url: article.url,
      image: article.ogImage ?? article.coverImage,
      datePublished: article.publishedAt,
    })),
    "/sunrisers-hyderabad/match-previews/",
  );

  return (
    <div className="page-stack">
      <h1 className="sr-only">SRH match previews and pre-match tactical reads</h1>
      <script
        id="match-previews-itemlist-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {featuredPreview ? (
        <section className="section-stack">
          <SectionHeader
            title="Next Game"
          />
          <NextMatchPreviewCard
            article={featuredPreview.article}
            fixture={featuredPreview.fixture}
          />
        </section>
      ) : null}

      {remainingPreviews.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Archive"
            title="Older Previews"
          />
          <div className="grid gap-8 md:grid-cols-2">
            {remainingPreviews.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      ) : null}

      {!featuredPreview ? (
        <div className="glass-panel p-10 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted italic">Nothing scheduled</p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-foreground">
            The next preview will appear here
          </h2>
        </div>
      ) : null}
    </div>
  );
}
