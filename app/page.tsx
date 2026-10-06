import Link from "next/link";

import { ArticleCard } from "@/components/articles/ArticleCard";
import { LatestNewsFeed } from "@/components/home/LatestNewsFeed";
import { MatchWidget } from "@/components/home/MatchWidget";
import { PointsTableTeaser } from "@/components/home/PointsTableTeaser";
import { SquadSpotlight } from "@/components/home/SquadSpotlight";
import { Reveal } from "@/components/ui/Reveal";
import { getArticleBySlug, getLatestArticles } from "@/lib/content/articles";
import { getLatestMatchReport } from "@/lib/content/match-coverage";
import { getPlayerOfTheSeason, getSeasonPlayerStat } from "@/lib/content/player-season-stats";
import { getPointsTable } from "@/lib/content/points-table";
import { getLatestResult, getNextFixture, getSchedule } from "@/lib/content/schedule";
import { getAllGalleryAlbums } from "@/lib/content/gallery";
import { getSquad, getSquadSpotlightPlayer } from "@/lib/content/squad";
import { getSiteConfig } from "@/lib/content/site";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { compareDatesDesc } from "@/lib/utils/date";
import { withBasePath } from "@/lib/utils/paths";

export const metadata = buildPageMetadata({
  title: "Sunrisers Hyderabad News, Match Reports & IPL 2026 Coverage",
  description: "SRH match reports, previews, news, squad profiles, stats and photo galleries from a supporter-run newsroom.",
  path: "/",
});

function fixtureOutcome(result: string | null | undefined): "W" | "L" | "–" {
  if (!result) {
    return "–";
  }

  return result.startsWith("Sunrisers Hyderabad") ? "W" : "L";
}

function ordinalPlace(position: number): string {
  const suffix = position === 1 ? "st" : position === 2 ? "nd" : position === 3 ? "rd" : "th";
  return `${position}${suffix} place`;
}

export default function HomePage() {
  const site = getSiteConfig();
  const schedule = getSchedule();
  const table = getPointsTable();
  const srhRow = table?.standings.find((row) => row.teamCode === "SRH") ?? null;
  const latestResult = getLatestResult();
  const nextFixture = getNextFixture();
  const spotlightPlayer = getSquadSpotlightPlayer();
  const seasonBest = getPlayerOfTheSeason();
  const albums = getAllGalleryAlbums();
  const marqueePhotos = albums.flatMap((album) => album.photos.slice(0, 2)).slice(0, 12);

  const latestNews = getLatestArticles("news", 8);
  const featuredNews =
    latestNews[0]
    ?? getArticleBySlug("news", site.homepage.featuredNewsSlug)
    ?? null;
  const latestMatchCoverage = getLatestMatchReport();
  const heroStory = [latestMatchCoverage, featuredNews]
    .filter((article) => article !== null)
    .sort((left, right) => compareDatesDesc(left.publishedAt, right.publishedAt))[0] ?? null;

  const latestCoverage = getLatestArticles("match-coverage", 3);

  // Left column: the two freshest stories across desks (news + reports),
  // so it never freezes on stale coverage in the off-season.
  const featuredLeft = [...latestNews, ...latestCoverage]
    .sort((left, right) => compareDatesDesc(left.publishedAt, right.publishedAt))
    .filter((article) => article.slug !== heroStory?.slug)
    .slice(0, 2);

  // Rail: latest news not already featured — no duplicates anywhere.
  const featuredSlugs = new Set([heroStory?.slug, ...featuredLeft.map((a) => a.slug)]);
  const railNews = latestNews.filter((article) => !featuredSlugs.has(article.slug));

  const internationals = getLatestArticles("news", 20)
    .filter((article) => article.category === "International Cricket")
    .slice(0, 3);

  const kishan2026 = getSeasonPlayerStat("ishan-kishan");
  const abhishek2026 = getSeasonPlayerStat("abhishek-sharma");

  const playerWatch = [
    {
      slug: "ishan-kishan",
      name: "Ishan Kishan",
      context: "India · T20Is",
      highlight: "World No. 1 T20I batter",
      numbers: `${kishan2026?.runs ?? "—"} runs @ ${kishan2026?.strikeRate ?? "—"} · IPL 2026`,
    },
    {
      slug: "abhishek-sharma",
      name: "Abhishek Sharma",
      context: "India · T20Is",
      highlight: "Asian Games gold · 61(28) in final",
      numbers: `${abhishek2026?.runs ?? "—"} runs @ ${abhishek2026?.strikeRate ?? "—"} · IPL 2026`,
    },
    {
      slug: "nitish-kumar-reddy",
      name: "Nitish Kumar Reddy",
      context: "India · ODIs vs West Indies",
      highlight: "In the XI as Asian Games made way",
      numbers: "Withdrawn from Nagoya · picked for ODIs",
    },
    {
      slug: "heinrich-klaasen",
      name: "Heinrich Klaasen",
      context: "South Africa · White-ball",
      highlight: "Player of the season",
      numbers: "624 runs — SRH's best",
    },
  ];

  const squadImages = new Map(getSquad().players.map((player) => [player.slug, player]));

  const wins = schedule.fixtures.filter(
    (fixture) => fixtureOutcome(fixture.result) === "W",
  ).length;
  const losses = schedule.fixtures.filter(
    (fixture) => fixtureOutcome(fixture.result) === "L",
  ).length;

  // League record and finish come from the official standings table;
  // fixture counts (which include the Eliminator) are the fallback.
  const leagueRecord = srhRow ? `${srhRow.won}–${srhRow.lost}` : `${wins}–${losses}`;
  const leagueFinish = srhRow ? ordinalPlace(srhRow.position) : "3rd place";

  return (
    <div className="page-stack">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes home-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .home-marquee-track { animation: home-marquee 40s linear infinite; }
          .home-marquee:hover .home-marquee-track { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) { .home-marquee-track { animation: none; } }
        `,
        }}
      />

      {/* Match-center strip */}
      <Reveal>
        <section className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-[#0d0d0d] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#ff6d00]" />
            <p className="min-w-0 break-words text-[11px] font-black uppercase tracking-[0.24em] text-white/70">
              Season complete · {leagueFinish} · Eliminator
            </p>
          </div>
          <p className="min-w-0 break-words text-sm font-bold text-white sm:truncate">
            {latestResult?.result ?? "Full 2026 campaign archived"}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-black uppercase tracking-[0.2em]">
            <span className="text-white">
              {leagueRecord} W–L
            </span>
            <span className="text-[#ff6d00]">{leagueFinish}</span>
            <Link
              href="/sunrisers-hyderabad/schedule/"
              className="text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              All games
            </Link>
          </div>
        </section>
      </Reveal>

      {/* Hero */}
      <Reveal>
        <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[#0d0d0d] text-white shadow-sm">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 85% at 88% 8%, rgba(255,109,0,0.4) 0%, rgba(255,109,0,0) 60%), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px)",
            }}
          />
          <p
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-6 right-2 select-none text-[5.5rem] font-black uppercase leading-none tracking-tighter text-white/[0.06] sm:text-[10rem]"
          >
            SRH
          </p>
          <div className="relative z-10 grid gap-10 p-6 sm:p-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex items-center rounded-full border-none bg-[#ff6d00] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
                IPL 2026 · Orange Army
              </p>
              <h1 className="mt-5 break-words text-4xl font-black uppercase leading-[0.92] tracking-tight min-[480px]:text-5xl sm:text-7xl">
                Rise. Roar.
                <br />
                <span className="text-transparent [-webkit-text-stroke:2px_#ff6d00]">
                  Relive it.
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-sm font-medium leading-relaxed text-white/70 sm:text-base">
                {schedule.fixtures.length} games, one Eliminator heartbreak, {seasonBest.runs}{" "}
                {seasonBest.name} runs. The whole campaign — reports, photos, numbers — lives
                on this site.
              </p>
              <dl className="mt-6 flex flex-wrap gap-2">
                {[
                  `${wins}W – ${losses}L`,
                  leagueFinish,
                  `${seasonBest.runs} ${seasonBest.name.split(" ").pop()} runs`,
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-white/85"
                  >
                    {chip}
                  </span>
                ))}
              </dl>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/sunrisers-hyderabad/match-coverage/"
                  className="rounded-full bg-white px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-black transition-colors hover:bg-neutral-200"
                >
                  Read the reports
                </Link>
                <Link
                  href="/sunrisers-hyderabad/gallery/"
                  className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black"
                >
                  See the photos
                </Link>
              </div>
            </div>
            {heroStory ? (
              <div className="flex flex-col justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
                  Lead story
                </p>
                <p className="mt-4 text-xl font-black uppercase leading-tight tracking-tight sm:text-2xl">
                  {heroStory.title}
                </p>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-400">
                  {heroStory.excerpt}
                </p>
                <Link
                  href={heroStory.url}
                  className="mt-6 rounded-full bg-[#ff6d00] px-6 py-3 text-center text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#e05f00]"
                >
                  Full story
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </Reveal>

      {/* Player watch: orange players, every stage */}
      <Reveal>
        <section>
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
                Beyond Hyderabad
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                Player watch
              </h2>
            </div>
            <span className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted sm:inline">
              Club · Country · Leagues
            </span>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {playerWatch.map((entry) => {
              const player = squadImages.get(entry.slug);
              return (
                <li key={entry.slug}>
                  <Link
                    href={`/sunrisers-hyderabad/squad/${entry.slug}/`}
                    className="glass-panel group flex h-full items-center gap-4 p-5 transition-all hover:border-accent/40"
                  >
                    {player ? (
                      <img
                        src={player.image}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        width={96}
                        height={96}
                        className="h-12 w-12 shrink-0 rounded-full border border-border bg-surface-strong object-cover object-top"
                      />
                    ) : null}
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                        {entry.context}
                      </span>
                      <span className="mt-0.5 block truncate text-base font-black uppercase tracking-tight text-foreground transition-colors group-hover:text-accent">
                        {entry.name}
                      </span>
                      <span className="mt-1 block text-[13px] font-bold leading-snug text-foreground">
                        {entry.highlight}
                      </span>
                      <span className="block text-xs font-medium text-muted">{entry.numbers}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </Reveal>

      {/* Bento grid */}
      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Reveal className="md:col-span-2 lg:col-span-2">
          <MatchWidget
            nextFixture={nextFixture}
            latestResult={latestResult}
            seasonSummary={{ wins, losses, position: "3rd place" }}
          />
        </Reveal>
        <Reveal className="min-w-0" delayMs={80}>
          <SquadSpotlight player={spotlightPlayer} />
        </Reveal>
        <Reveal className="md:col-span-2 lg:col-span-2">
          <PointsTableTeaser table={table} />
        </Reveal>
        <Reveal delayMs={80}>
          <aside className="glass-panel flex h-full flex-col justify-between gap-6 p-6 sm:p-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
                Player of the season
              </p>
              <p className="mt-3 text-3xl font-black uppercase tracking-tight text-foreground">
                {seasonBest.name}
              </p>
              <p className="mt-2 text-sm font-medium text-muted">
                {seasonBest.runs} runs · {seasonBest.sixes} sixes ·{" "}
                {seasonBest.strikeRate} strike rate. The vote agreed with the numbers.
              </p>
            </div>
            <Link
              href="/sunrisers-hyderabad/player-poll/"
              className="rounded-full bg-black px-6 py-3 text-center text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800"
            >
              See the poll
            </Link>
          </aside>
        </Reveal>
      </div>

      {/* In national colors */}
      {internationals.length ? (
        <Reveal>
          <section>
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
                  Country duty
                </p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                  In national colors
                </h2>
              </div>
              <Link
                href="/sunrisers-hyderabad/news/"
                className="shrink-0 text-[11px] font-black uppercase tracking-[0.2em] text-accent hover:underline"
              >
                Newsroom
              </Link>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {internationals.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </section>
        </Reveal>
      ) : null}

      {/* Season timeline */}
      <Reveal>
        <section>
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
                The campaign
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                Season in one scroll
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-black/[0.05] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
              {schedule.fixtures.length} games
            </span>
          </div>
          <ol className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            {schedule.fixtures.map((fixture, index) => {
              const outcome = fixtureOutcome(fixture.result);
              return (
                <li key={fixture.id} className="snap-start">
                  <Link
                    href={
                      fixture.reportSlug
                        ? `/sunrisers-hyderabad/match-coverage/${fixture.reportSlug}/`
                        : "/sunrisers-hyderabad/schedule/"
                    }
                    title={fixture.result ?? fixture.opponent}
                    className="glass-panel flex w-20 flex-col items-center gap-1.5 px-2 py-4 transition-all hover:border-accent/40"
                  >
                    <span className="text-[10px] font-black text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white ${
                        outcome === "W" ? "bg-emerald-500" : outcome === "L" ? "bg-[#ff6d00]" : "bg-neutral-400"
                      }`}
                    >
                      {outcome}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">
                      {fixture.opponent
                        .split(" ")
                        .map((word) => word[0])
                        .join("")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      </Reveal>

      {/* Photo marquee */}
      <Reveal>
        <section className="overflow-hidden">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6d00]">
                Matchday frames
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                From the galleries
              </h2>
            </div>
            <Link
              href="/sunrisers-hyderabad/gallery/"
              className="shrink-0 text-[11px] font-black uppercase tracking-[0.2em] text-accent hover:underline"
            >
              All albums
            </Link>
          </div>
          <div className="home-marquee relative -mx-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="home-marquee-track flex w-max gap-4">
              {[...marqueePhotos, ...marqueePhotos].map((photo, index) => (
                <figure
                  key={`${photo.src}-${index}`}
                  className="group relative h-32 w-56 shrink-0 overflow-hidden rounded-2xl border border-border sm:h-40 sm:w-72"
                >
                  <img
                    src={withBasePath(photo.src)}
                    alt=""
                    aria-hidden={index >= marqueePhotos.length}
                    loading="lazy"
                    width={400}
                    height={225}
                    className="h-full w-full object-cover"
                  />
                  {photo.caption ? (
                    <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-8 text-[11px] font-semibold leading-snug text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <span className="line-clamp-2">{photo.caption}</span>
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Featured + newsroom river */}
      <Reveal>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {featuredLeft.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
          <div className="lg:col-span-1">
            <LatestNewsFeed articles={railNews} />
          </div>
        </div>
      </Reveal>
    </div>
  );
}
