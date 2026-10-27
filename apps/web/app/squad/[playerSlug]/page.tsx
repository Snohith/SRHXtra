import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import PlayerAvatar from "@/components/PlayerAvatar";
import CountUp from "@/components/CountUp";
import { SITE_URL } from "@/lib/api";
import { serializeJsonLd } from "@/lib/jsonld";
import {
  badgeKind,
  getAllProfiles,
  getProfile,
  type PlayerProfile,
  type ProfileNeighbour,
  type StatTile,
} from "@/lib/players";
import { battingCode, initials } from "@/lib/squad";

/**
 * Player profile (/squad/[playerSlug]) — fully static: every squad member is
 * pre-rendered at build time and unknown slugs 404 instead of rendering on
 * demand. Portraits, flags, stats, and socials are referenced by the exact
 * URLs published in the official SRH player feed (data/players.json); the
 * four players the feed does not cover keep a clean basic profile.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllProfiles().map((profile) => ({ playerSlug: profile.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerSlug: string }>;
}): Promise<Metadata> {
  const { playerSlug } = await params;
  const profile = getProfile(playerSlug);
  if (!profile) return { title: "Player not found" };

  const { player, roleLabel, country } = profile;
  const title = `${player.name} — SRH player profile`;
  const context = `${roleLabel} · ${country.country}`;
  const description = profile.matches
    ? `${player.name} (${context}) — IPL career stats, portrait and profile links for the Sunrisers Hyderabad IPL 2026 squad.`
    : `${player.name} (${context}) — Sunrisers Hyderabad player page for the IPL 2026 squad.`;

  return {
    title,
    description,
    alternates: { canonical: `/squad/${profile.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/squad/${profile.slug}`,
      type: "profile",
    },
  };
}

/* ---------------------------------------------------------------------- */
/* Structured data — Person (the athlete) + breadcrumb trail.              */
/* ---------------------------------------------------------------------- */

function personJsonLd(profile: PlayerProfile) {
  const { player, country } = profile;
  const image = profile.portrait ?? profile.cardImage ?? player.headshot;
  const sameAs = [profile.social.instagram, profile.social.twitter].filter(
    (url): url is string => Boolean(url),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.name,
    url: `${SITE_URL}/squad/${profile.slug}`,
    jobTitle: profile.roleLabel,
    ...(image ? { image } : {}),
    nationality: { "@type": "Country", name: country.country },
    memberOf: {
      "@type": "SportsTeam",
      name: "Sunrisers Hyderabad",
      sport: "Cricket",
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

function breadcrumbJsonLd(profile: PlayerProfile) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Squad",
        item: `${SITE_URL}/squad`,
      },
      { "@type": "ListItem", position: 3, name: profile.player.name },
    ],
  };
}

/* ---------------------------------------------------------------------- */
/* Icons — inline so the page ships no icon-font or image requests.       */
/* ---------------------------------------------------------------------- */

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

/* ---------------------------------------------------------------------- */

function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <dl className="stat-tiles">
      {tiles.map((tile) => (
        <div className="stat-tile" key={tile.label}>
          <dt>{tile.label}</dt>
          <dd>
            <CountUp value={tile.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function NeighbourAvatar({ neighbour }: { neighbour: ProfileNeighbour }) {
  if (!neighbour.avatar) {
    return <PlayerAvatar player={neighbour.player} />;
  }
  return (
    <span className="pager-avatar">
      <Image
        src={neighbour.avatar}
        alt=""
        fill
        sizes="44px"
        aria-hidden="true"
      />
    </span>
  );
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerSlug: string }>;
}) {
  const { playerSlug } = await params;
  const profile = getProfile(playerSlug);
  if (!profile) notFound();

  const { player, country, batting, bowling, prev, next } = profile;
  const cutout = profile.portrait ?? profile.cardImage;
  const hasStats = batting.length > 0 || bowling.length > 0;

  return (
    <div className="wrap player-profile">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(personJsonLd(profile)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd(profile)),
        }}
      />

      <nav className="crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/squad">Squad</Link>
          </li>
          <li aria-current="page">{player.name}</li>
        </ol>
      </nav>

      <header className="player-hero" data-reveal="" data-spotlight="">
        <div className="player-hero-media">
          {cutout ? (
            <Image
              src={cutout}
              alt={`${player.name} in the Sunrisers Hyderabad kit`}
              fill
              priority
              sizes="(max-width: 719px) 320px, 360px"
              className="hero-img"
            />
          ) : (
            <span className="hero-badge">
              <span className="hero-badge-ring">
                {player.headshot ? (
                  <Image
                    src={player.headshot}
                    alt={`${player.name}, Sunrisers Hyderabad`}
                    fill
                    priority
                    sizes="220px"
                    className="hero-img"
                  />
                ) : (
                  <span className="player-hero-initials" aria-hidden="true">
                    {initials(player.name)}
                  </span>
                )}
              </span>
            </span>
          )}
        </div>

        <div className="player-hero-body">
          <p className="player-hero-kicker">{profile.roleLabel} · IPL 2026</p>
          <h1>{player.name}</h1>
          <p className="player-hero-meta">
            <span className="m-chip">
              {profile.flag && (
                <Image
                  className="flag"
                  src={profile.flag}
                  alt=""
                  width={18}
                  height={18}
                />
              )}
              {country.country}
            </span>
            <span className="m-chip">
              <abbr title={player.bats}>{battingCode(player)}</abbr>
            </span>
            {profile.jerseyNumber !== undefined && (
              <span className="m-chip">Jersey #{profile.jerseyNumber}</span>
            )}
          </p>

          {profile.badges.length > 0 && (
            <ul className="player-badge-row" role="list">
              {profile.badges.map((badge) => (
                <li key={badge} className={`p-badge ${badgeKind(badge)}`}>
                  {badge}
                </li>
              ))}
            </ul>
          )}

          {(profile.social.instagram || profile.social.twitter) && (
            <div className="player-social">
              {profile.social.instagram && (
                <a
                  className="social-btn"
                  href={profile.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={`${player.name} on Instagram`}
                >
                  <InstagramIcon />
                </a>
              )}
              {profile.social.twitter && (
                <a
                  className="social-btn"
                  href={profile.social.twitter}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={`${player.name} on X`}
                >
                  <XIcon />
                </a>
              )}
            </div>
          )}
        </div>

        {profile.jerseyNumber !== undefined && (
          <span className="player-hero-num" aria-hidden="true">
            {profile.jerseyNumber}
          </span>
        )}
      </header>

      <section className="player-stats" aria-labelledby="player-stats-heading">
        <div className="section-head" data-reveal="">
          <h2 id="player-stats-heading">IPL career stats</h2>
          {profile.matches !== undefined && (
            <span className="group-count">{profile.matches} matches</span>
          )}
        </div>

        {hasStats ? (
          <div className="stat-panels" data-reveal="">
            {batting.length > 0 && (
              <section
                className="stat-panel"
                aria-labelledby="player-batting-heading"
              >
                <div className="stat-panel-head">
                  <h3 id="player-batting-heading">Batting</h3>
                  <span>career figures</span>
                </div>
                <StatTiles tiles={batting} />
              </section>
            )}
            {bowling.length > 0 && (
              <section
                className="stat-panel"
                aria-labelledby="player-bowling-heading"
              >
                <div className="stat-panel-head">
                  <h3 id="player-bowling-heading">Bowling</h3>
                  <span>career figures</span>
                </div>
                <StatTiles tiles={bowling} />
              </section>
            )}
          </div>
        ) : (
          <div className="player-pending" data-reveal="">
            <strong>Career stats coming soon.</strong>
          </div>
        )}
      </section>

      {(prev || next) && (
        <nav
          className="player-pager"
          aria-label="Squad navigation"
          data-reveal=""
        >
          {prev ? (
            <Link
              className="pager-link"
              href={`/squad/${prev.slug}`}
              rel="prev"
            >
              <NeighbourAvatar neighbour={prev} />
              <span className="pager-text">
                <span className="pager-dir">Previous player</span>
                <span className="pager-name">{prev.player.name}</span>
              </span>
            </Link>
          ) : (
            <span className="pager-link is-ghost" aria-hidden="true" />
          )}
          {next ? (
            <Link
              className="pager-link"
              href={`/squad/${next.slug}`}
              rel="next"
            >
              <NeighbourAvatar neighbour={next} />
              <span className="pager-text">
                <span className="pager-dir">Next player</span>
                <span className="pager-name">{next.player.name}</span>
              </span>
            </Link>
          ) : (
            <span className="pager-link is-ghost" aria-hidden="true" />
          )}
        </nav>
      )}

      <div className="player-cta">
        <Link className="btn primary" href="/squad">
          Back to the full squad
        </Link>
      </div>
    </div>
  );
}
