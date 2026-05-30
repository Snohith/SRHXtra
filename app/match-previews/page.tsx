import { ArticleCard } from "@/components/articles/ArticleCard";
import { NextMatchPreviewCard } from "@/components/articles/NextMatchPreviewCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getArchivedMatchPreviews, getNextMatchPreviewFeature } from "@/lib/content/match-previews";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH Match Previews — Pre-Match Tactical Reads",
  description: "Before-the-toss Sunrisers Hyderabad previews.",
  path: "/match-previews/",
});

export default function MatchPreviewsIndexPage() {
  const featuredPreview = getNextMatchPreviewFeature();
  const remainingPreviews = getArchivedMatchPreviews();

  return (
    <div className="page-stack">
      <SectionHeader
        title="Match Previews"
        variant="hero"
        headingLevel={1}
      />

      {featuredPreview ? (
        <section className="section-stack">
          <SectionHeader
            title="The Next Match"
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
            title="Previous Notebooks"
          />
          <div className="grid gap-8 lg:grid-cols-2">
            {remainingPreviews.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </section>
      ) : null}

      {!featuredPreview ? (
        <div className="glass-panel p-10 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted italic">Updates pending</p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-foreground">
            Pre-match reads will return shortly
          </h2>
        </div>
      ) : null}
    </div>
  );
}
