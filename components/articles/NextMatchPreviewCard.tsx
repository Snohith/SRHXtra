import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import type { Article } from "@/lib/content/articles";
import { resolveArticleImage } from "@/lib/content/images";
import type { Fixture } from "@/lib/content/schedule";
import { cx } from "@/lib/utils/classes";
import { formatDisplayDate } from "@/lib/utils/date";
import { getTeamInfo } from "@/lib/utils/team-info";

interface NextMatchPreviewCardProps {
  article: Article;
  fixture: Fixture;
}

function getFixtureDateTime(fixture: Fixture) {
  const [time] = fixture.time.split(" ");

  return `${fixture.date}T${time}:00+05:30`;
}

function getPreviewTitle(fixture: Fixture) {
  const homeTeam = getTeamInfo(fixture.homeTeam);
  const awayTeam = getTeamInfo(fixture.awayTeam);
  const venueName = fixture.venue.split(",")[0] ?? fixture.venue;

  return `${homeTeam.code} vs ${awayTeam.code} Preview — ${venueName}`;
}

export function NextMatchPreviewCard({ article, fixture }: NextMatchPreviewCardProps) {
  const homeTeam = getTeamInfo(fixture.homeTeam);
  const awayTeam = getTeamInfo(fixture.awayTeam);
  const fixtureDateTime = getFixtureDateTime(fixture);
  const title = getPreviewTitle(fixture);
  const articleImage = resolveArticleImage({
    collection: "match-previews",
    slug: article.slug,
    coverImage: article.coverImage,
    coverAlt: `${homeTeam.name} vs ${awayTeam.name} preview at ${fixture.venue}`,
    title,
  });

  return (
    <article
      itemScope
      itemType="https://schema.org/Article"
      className="premium-card group grid gap-0 lg:grid-cols-[1.2fr_0.8fr]"
    >
      <div className="order-2 flex flex-col justify-center p-6 sm:p-8 lg:order-1">
        <div className="flex flex-wrap items-center gap-4">
          <Badge tone="accent">{fixture.competition}</Badge>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/80">
            <time dateTime={fixtureDateTime}>
              {formatDisplayDate(fixture.date)} • {fixture.time}
            </time>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/80">
            {fixture.venue}
          </span>
        </div>

        <h3
          itemProp="headline"
          className="mt-5 text-3xl font-black leading-[1.2] tracking-tight transition-colors group-hover:text-accent sm:text-4xl lg:text-5xl"
        >
          <Link href={article.url} itemProp="url" className="after:absolute after:inset-0">
            {title}
          </Link>
        </h3>

        <p itemProp="description" className="mt-4 text-muted line-clamp-3 body-copy">
          {homeTeam.name} vs {awayTeam.name} is scheduled for {formatDisplayDate(fixture.date)} at{" "}
          {fixture.time} at {fixture.venue}. Our preview covers form, the key matchups and
          the selection calls for the next SRH game.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Tag label={homeTeam.name} />
          <Tag label={awayTeam.name} />
          <Tag label={fixture.venue} />
        </div>
      </div>

      <div className="relative order-1 aspect-[16/10] overflow-hidden bg-surface-strong lg:order-2 lg:aspect-auto lg:h-full">
        <Image
          alt={articleImage.alt}
          itemProp="image"
          className={cx(
            "h-full w-full transition-transform duration-700 group-hover:scale-105",
            articleImage.fitClassName ?? "object-cover",
          )}
          height={800}
          src={articleImage.src}
          width={1200}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      </div>
    </article>
  );
}
