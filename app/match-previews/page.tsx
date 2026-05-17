import { ArticleCard } from "@/components/articles/ArticleCard";
import { NextMatchPreviewCard } from "@/components/articles/NextMatchPreviewCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getArchivedMatchPreviews, getNextMatchPreviewFeature } from "@/lib/content/match-previews";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH Match Previews — Pre-Match Tactical Reads",
  description: "Before-the-toss Sunrisers Hyderabad previews with fixture context, tactical matchups, selection questions, and restrained pre-match verdicts.",
  path: "/match-previews/",
});

export default function MatchPreviewsIndexPage() {
  const featuredPreview = getNextMatchPreviewFeature();
  const remainingPreviews = getArchivedMatchPreviews();

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Preview Desk"
        title="Match Previews"
        description="Before-the-ball analysis for SRH fixtures: matchup maps, selection questions, venue context, and careful pre-toss reads."
        variant="hero"
        headingLevel={1}
      />

      {featuredPreview ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Scouting"
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
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">
            Pre-match reads will return shortly
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted">
            The preview desk is currently preparing analysis for upcoming fixtures. Check back as matchday approaches.
          </p>
        </div>
      ) : null}
    </div>
  );
}
