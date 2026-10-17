import type { Metadata } from "next";

import { SITE_URL } from "@/lib/api";
import {
  CAPTAIN,
  HEAD_COACH,
  initials,
  OVERSEAS_COUNT,
  roleCount,
  SQUAD,
  SQUAD_GROUPS,
  type SquadPlayer,
} from "@/lib/squad";

export const metadata: Metadata = {
  title: "SRH squad — IPL 2026",
  description:
    "The full Sunrisers Hyderabad squad for IPL 2026 — 25 players, 8 overseas, captain Pat Cummins. Updated for the October trade: T Natarajan back home, Zeeshan Ansari to Delhi Capitals.",
  alternates: { canonical: "/squad" },
  openGraph: {
    title: "SRH squad — IPL 2026",
    description:
      "Every Sunriser for IPL 2026: 25 players, 8 overseas, captain Pat Cummins — updated after the October trade window.",
    url: `${SITE_URL}/squad`,
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsTeam",
  name: "Sunrisers Hyderabad",
  sport: "Cricket",
  url: `${SITE_URL}/squad`,
  coach: { "@type": "Person", name: HEAD_COACH },
  athlete: SQUAD.map((p) => ({
    "@type": "Person",
    name: p.name,
    nationality: p.country,
  })),
};

function PlayerCard({ player }: { player: SquadPlayer }) {
  return (
    <div className="player-card">
      <span className="player-avatar" aria-hidden="true">
        {initials(player.name)}
      </span>
      <div className="player-info">
        <h3>
          {player.name}
          {player.captain && <span className="player-badge">Captain</span>}
          {player.tag && (
            <span className="player-badge trade">{player.tag}</span>
          )}
        </h3>
        <p>
          {player.country} · {player.bats}
        </p>
      </div>
      {player.number !== undefined && (
        <span
          className="player-num"
          aria-label={`Squad number ${player.number}`}
        >
          #{player.number}
        </span>
      )}
    </div>
  );
}

export default function SquadPage() {
  return (
    <div className="wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header style={{ marginTop: 4 }}>
        <span className="cat">IPL 2026 · Orange Army</span>
        <h1
          style={{
            margin: "6px 0 4px",
            fontSize: 34,
            letterSpacing: "-0.02em",
          }}
        >
          The 2026 squad
        </h1>
        <p className="standfirst" style={{ maxWidth: 720 }}>
          {SQUAD.length} players · {OVERSEAS_COUNT} overseas · one attacking
          plan. Every Sunriser for IPL 2026, updated after the October trade
          window.
        </p>
      </header>

      {CAPTAIN && (
        <div className="captain">
          <span className="player-avatar" aria-hidden="true">
            {initials(CAPTAIN.name)}
          </span>
          <div>
            <span className="captain-label">Captain · #{CAPTAIN.number}</span>
            <strong>{CAPTAIN.name}</strong>
            <span className="captain-meta">
              {CAPTAIN.country} · {CAPTAIN.bats} · Head coach {HEAD_COACH}
            </span>
          </div>
        </div>
      )}

      <div className="squad-stats">
        <div className="squad-stat">
          <b>{SQUAD.length}</b>
          <span>Players</span>
        </div>
        <div className="squad-stat">
          <b>{OVERSEAS_COUNT}</b>
          <span>Overseas</span>
        </div>
        <div className="squad-stat">
          <b>{roleCount("Wicketkeepers")}</b>
          <span>Wicketkeepers</span>
        </div>
        <div className="squad-stat">
          <b>{roleCount("Bowlers")}</b>
          <span>Bowlers</span>
        </div>
      </div>

      {SQUAD_GROUPS.map((group, index) => {
        const players = SQUAD.filter((p) => p.role === group.role);
        return (
          <section className="section" key={group.role}>
            <div className="section-head">
              <h2>
                <span className="g-num">
                  {String(index + 1).padStart(2, "0")}
                </span>{" "}
                {group.role}
              </h2>
              <span className="group-count">
                {players.length} {players.length === 1 ? "player" : "players"}
              </span>
            </div>
            <p className="group-blurb">{group.blurb}</p>
            <div className="squad-grid">
              {players.map((player) => (
                <PlayerCard key={player.name} player={player} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="meta" style={{ marginTop: 22 }}>
        Squad reflects the confirmed T Natarajan (in) / Zeeshan Ansari (out)
        trade with Delhi Capitals, October 2026. Jersey numbers per official IPL
        listings.
      </p>
    </div>
  );
}
