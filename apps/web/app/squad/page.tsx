import type { Metadata } from "next";
import Link from "next/link";

import PlayerAvatar from "@/components/PlayerAvatar";
import SquadRoster from "@/components/SquadRoster";
import { SITE_URL } from "@/lib/api";
import { serializeJsonLd } from "@/lib/jsonld";
import { getAllProfiles } from "@/lib/players";
import {
  CAPTAIN,
  countryInfo,
  DOMESTIC_COUNT,
  HEAD_COACH,
  OVERSEAS_COUNT,
  playerSlug,
  roleCount,
  roleInfo,
  SQUAD,
  SQUAD_ROLES,
} from "@/lib/squad";

export const metadata: Metadata = {
  title: "SRH squad — IPL 2026",
  description:
    "Every Sunriser for IPL 2026: all 25 players by role, 8 overseas stars, captain Pat Cummins and head coach Daniel Vettori.",
  alternates: { canonical: "/squad" },
  openGraph: {
    title: "SRH squad — IPL 2026",
    description:
      "All 25 Sunrisers for IPL 2026 by role — 8 overseas, captain Pat Cummins, head coach Daniel Vettori.",
    url: `${SITE_URL}/squad`,
    type: "website",
  },
};

/**
 * SportsTeam structured data: the roster as `athlete` Persons (country +
 * role), the coach, and the captain's role — the same OrganizationRole
 * pattern schema.org documents for team members.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsTeam",
  name: "Sunrisers Hyderabad",
  alternateName: "SRH",
  sport: "Cricket",
  url: `${SITE_URL}/squad`,
  memberOf: { "@type": "SportsOrganization", name: "Indian Premier League" },
  award: "Indian Premier League champion (2016)",
  coach: { "@type": "Person", name: HEAD_COACH, jobTitle: "Head coach" },
  ...(CAPTAIN && {
    member: {
      "@type": "OrganizationRole",
      roleName: "Captain",
      member: { "@type": "Person", name: CAPTAIN.name },
    },
  }),
  athlete: SQUAD.map((player) => ({
    "@type": "Person",
    name: player.name,
    url: `${SITE_URL}/squad/${playerSlug(player.name)}`,
    ...(player.headshot ? { image: player.headshot } : {}),
    nationality: {
      "@type": "Country",
      name: countryInfo(player.country).country,
    },
    jobTitle: roleInfo(player.role).singular,
  })),
};

/**
 * Official feed kit portraits keyed by squad name. The images are referenced
 * by the exact URLs published in the SRH player feed — nothing is re-hosted —
 * and the roster falls back to IPL headshots for players the feed misses.
 */
const AVATARS: Record<string, string> = Object.fromEntries(
  getAllProfiles().flatMap((profile) =>
    profile.cardImage ? [[profile.player.name, profile.cardImage]] : [],
  ),
);

export default function SquadPage() {
  const compositionLabel = `Squad by role: ${SQUAD_ROLES.map(
    (info) => `${info.role} ${roleCount(info.role)}`,
  ).join(", ")}`;

  return (
    <div className="wrap squad-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <header className="squad-hero" data-reveal="">
        <div className="squad-hero-top">
          <span className="squad-kicker">IPL 2026 · Orange Army</span>
        </div>
        <h1>The 2026 squad</h1>
        <p className="squad-standfirst">
          {SQUAD.length} players, {OVERSEAS_COUNT} overseas, one attacking plan.
          Every Sunriser for IPL 2026 — captain {CAPTAIN?.name} and head coach{" "}
          {HEAD_COACH} lead the way.
        </p>
        <dl className="squad-facts">
          <div>
            <dt>Captain</dt>
            <dd>{CAPTAIN?.name ?? "—"}</dd>
          </div>
          <div>
            <dt>Head coach</dt>
            <dd>{HEAD_COACH}</dd>
          </div>
          <div>
            <dt>Squad</dt>
            <dd>{SQUAD.length} players</dd>
          </div>
          <div>
            <dt>Overseas</dt>
            <dd>{OVERSEAS_COUNT} players</dd>
          </div>
        </dl>
      </header>

      <div className="squad-lead" data-reveal="">
        {CAPTAIN && (
          <Link
            className="captain-card"
            href={`/squad/${playerSlug(CAPTAIN.name)}`}
            aria-labelledby="captain-heading"
          >
            <PlayerAvatar
              player={CAPTAIN}
              variant="feature"
              priority
              src={AVATARS[CAPTAIN.name]}
            />
            <div className="captain-body">
              <span className="captain-label">
                Captain{CAPTAIN.number !== undefined && ` · #${CAPTAIN.number}`}
              </span>
              <h2 id="captain-heading">{CAPTAIN.name}</h2>
              <p className="captain-meta">
                {countryInfo(CAPTAIN.country).country} · {CAPTAIN.bats} ·{" "}
                {roleInfo(CAPTAIN.role).singular}
              </p>
              <p className="captain-note">
                Leads a {SQUAD.length}-strong squad under head coach{" "}
                {HEAD_COACH}.
              </p>
              <span className="captain-go" aria-hidden="true">
                View full profile →
              </span>
            </div>
          </Link>
        )}

        <section className="squad-glance" aria-labelledby="glance-heading">
          <h2 id="glance-heading">Squad composition</h2>
          <div className="comp-bar" role="img" aria-label={compositionLabel}>
            {SQUAD_ROLES.map((info) => (
              <span
                key={info.slug}
                className={`comp-seg seg-${info.slug}`}
                style={{ flexGrow: roleCount(info.role) }}
              />
            ))}
          </div>
          <ul className="comp-legend" role="list">
            {SQUAD_ROLES.map((info) => (
              <li key={info.slug}>
                <span
                  className={`comp-dot seg-${info.slug}`}
                  aria-hidden="true"
                />
                <span className="comp-name">{info.role}</span>
                <b className="comp-count">{roleCount(info.role)}</b>
              </li>
            ))}
          </ul>
          <p className="comp-note">
            {DOMESTIC_COUNT} domestic · {OVERSEAS_COUNT} overseas
          </p>
        </section>
      </div>

      <SquadRoster avatars={AVATARS} />
    </div>
  );
}
