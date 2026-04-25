import { ArticleCard } from "@/components/articles/ArticleCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getAllMatchPreviews } from "@/lib/content/match-previews";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH Match Previews — Pre-Match Tactical Reads",
  description: "Before-the-toss Sunrisers Hyderabad previews with fixture context, tactical matchups, selection questions, and restrained pre-match verdicts.",
  path: "/match-previews/",
});

export default function MatchPreviewsIndexPage() {
  const previews = getAllMatchPreviews();
  const featuredPreview = previews[0] ?? null;
  const remainingPreviews = previews.slice(1);

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
            eyebrow="Scouting File"
            title="Latest Pre-Match Read"
          />
          <ArticleCard article={featuredPreview} variant="featured" />
        </section>
      ) : null}

      {remainingPreviews.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Fixture Radar"
            title="Pre-Match Notebook"
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
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Preview Desk</p>
          <h2 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">
            Match previews will return with the next manual publish
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted">
            There are no live pre-match reads right now. This desk stays in place for future manually
            published previews once they are ready to go live.
          </p>
        </div>
      ) : null}
    </div>
  );
}
