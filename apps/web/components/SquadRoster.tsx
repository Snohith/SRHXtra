"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import PlayerAvatar from "@/components/PlayerAvatar";
import {
  battingCode,
  countryInfo,
  isOverseas,
  playerSlug,
  roleFromSlug,
  roleInfo,
  SQUAD,
  SQUAD_ROLES,
  OVERSEAS_COUNT,
  type SquadPlayer,
  type SquadRole,
} from "@/lib/squad";

type RoleFilter = SquadRole | "all";
type OriginFilter = "all" | "indian" | "overseas";

interface FilterState {
  query: string;
  role: RoleFilter;
  origin: OriginFilter;
}

const DEFAULT_STATE: FilterState = { query: "", role: "all", origin: "all" };

const ORIGIN_LABELS: Record<OriginFilter, string> = {
  all: "All",
  indian: "Indian",
  overseas: "Overseas",
};

/* ---------------------------------------------------------------------- */
/* Filter state ↔ URL (?q=…&role=…&origin=…) — shareable, no navigation.  */
/* ---------------------------------------------------------------------- */

function readStateFromUrl(): FilterState {
  const params = new URLSearchParams(window.location.search);
  const rawOrigin = params.get("origin");
  return {
    query: (params.get("q") ?? "").trim(),
    role: roleFromSlug(params.get("role")) ?? "all",
    origin:
      rawOrigin === "indian" || rawOrigin === "overseas" ? rawOrigin : "all",
  };
}

function writeStateToUrl(state: FilterState) {
  const params = new URLSearchParams(window.location.search);
  const write = (key: string, value: string) =>
    value ? params.set(key, value) : params.delete(key);
  write("q", state.query.trim());
  write("role", state.role === "all" ? "" : roleInfo(state.role).slug);
  write("origin", state.origin === "all" ? "" : state.origin);
  const qs = params.toString();
  const { pathname, hash } = window.location;
  window.history.replaceState(
    null,
    "",
    qs ? `${pathname}?${qs}${hash}` : `${pathname}${hash}`,
  );
}

/* ---------------------------------------------------------------------- */
/* Matching — name, country, role, or jersey number, accent-insensitive.  */
/* ---------------------------------------------------------------------- */

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchesQuery(player: SquadPlayer, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const info = countryInfo(player.country);
  const role = roleInfo(player.role);
  const haystack = normalize(
    [
      player.name,
      player.country,
      info.country,
      info.code,
      role.role,
      role.singular,
      player.number !== undefined ? `#${player.number}` : "",
    ].join(" "),
  );
  return q.split(/\s+/).every((token) => haystack.includes(token));
}

/* ---------------------------------------------------------------------- */

function PlayerCard({
  player,
  avatar,
}: {
  player: SquadPlayer;
  avatar?: string;
}) {
  const info = countryInfo(player.country);
  return (
    <Link
      className={`player-card${player.captain ? " is-captain" : ""}`}
      href={`/squad/${playerSlug(player.name)}`}
    >
      <PlayerAvatar player={player} src={avatar} />
      <div className="player-info">
        <h3>
          {player.name}
          {player.captain && <span className="player-badge">Captain</span>}
          {player.tag && (
            <span className="player-badge trade">{player.tag}</span>
          )}
        </h3>
        <p className="player-meta">
          <abbr title={info.country}>{info.code}</abbr>
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <abbr title={player.bats}>{battingCode(player)}</abbr>
        </p>
      </div>
      {player.number !== undefined && (
        <span className="player-num">
          <span className="sr-only">{`Jersey number ${player.number}`}</span>
          <span aria-hidden="true">{`#${player.number}`}</span>
        </span>
      )}
      <span className="player-go" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

export default function SquadRoster({
  avatars = {},
}: {
  /** Official feed kit portraits by player name (from the server page). */
  avatars?: Record<string, string>;
}) {
  const [state, setState] = useState<FilterState>(DEFAULT_STATE);

  // Apply a shared link's filters once after hydration, then canonicalise the
  // URL (unknown role slugs are dropped). Subsequent changes replace the URL
  // entry directly — no router navigation, no re-render of the page shell.
  useEffect(() => {
    const fromUrl = readStateFromUrl();
    if (fromUrl.query || fromUrl.role !== "all" || fromUrl.origin !== "all") {
      setState(fromUrl);
    }
    writeStateToUrl(fromUrl);
  }, []);

  const roleCounts = useMemo(
    () =>
      SQUAD_ROLES.map((info) => ({
        ...info,
        count: SQUAD.filter((p) => p.role === info.role).length,
      })),
    [],
  );

  const originCounts = useMemo<Record<OriginFilter, number>>(
    () => ({
      all: SQUAD.length,
      indian: SQUAD.filter((p) => !isOverseas(p)).length,
      overseas: OVERSEAS_COUNT,
    }),
    [],
  );

  const filtered = useMemo(
    () =>
      SQUAD.filter((player) => {
        if (state.role !== "all" && player.role !== state.role) return false;
        if (state.origin === "indian" && isOverseas(player)) return false;
        if (state.origin === "overseas" && !isOverseas(player)) return false;
        return matchesQuery(player, state.query);
      }),
    [state],
  );

  const filtersActive =
    state.role !== "all" || state.origin !== "all" || state.query.trim() !== "";

  function update(patch: Partial<FilterState>) {
    const next = { ...state, ...patch };
    setState(next);
    writeStateToUrl(next);
  }

  function clearFilters() {
    update(DEFAULT_STATE);
  }

  return (
    <section className="roster" aria-labelledby="roster-heading">
      <div className="section-head">
        <h2 id="roster-heading">The full roster</h2>
      </div>

      <div className="roster-toolbar">
        <div className="roster-search" role="search">
          <label className="sr-only" htmlFor="squad-search">
            Search players
          </label>
          <input
            id="squad-search"
            type="search"
            placeholder="Search name, country or number…"
            autoComplete="off"
            value={state.query}
            onChange={(e) => update({ query: e.target.value })}
            aria-controls="squad-roster-list"
          />
        </div>

        <div className="chip-group" role="group" aria-label="Filter by role">
          <span className="f-label" aria-hidden="true">
            Role
          </span>
          <button
            type="button"
            className="f-chip"
            aria-pressed={state.role === "all"}
            onClick={() => update({ role: "all" })}
          >
            All
            <span className="n">{SQUAD.length}</span>
          </button>
          {roleCounts.map((info) => (
            <button
              key={info.slug}
              type="button"
              className="f-chip"
              aria-pressed={state.role === info.role}
              onClick={() => update({ role: info.role })}
            >
              {info.role}
              <span className="n">{info.count}</span>
            </button>
          ))}
        </div>

        <div className="chip-group" role="group" aria-label="Filter by origin">
          <span className="f-label" aria-hidden="true">
            Origin
          </span>
          {(Object.keys(ORIGIN_LABELS) as OriginFilter[]).map((origin) => (
            <button
              key={origin}
              type="button"
              className="f-chip"
              aria-pressed={state.origin === origin}
              onClick={() => update({ origin })}
            >
              {ORIGIN_LABELS[origin]}
              <span className="n">{originCounts[origin]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="roster-status">
        <span role="status">
          {filtersActive
            ? `Showing ${filtered.length} of ${SQUAD.length} players`
            : `${SQUAD.length} players · ${OVERSEAS_COUNT} overseas`}
        </span>
        {filtersActive && (
          <button type="button" className="link-btn" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <div id="squad-roster-list">
        {filtered.length === 0 ? (
          <div className="empty roster-empty">
            <strong>
              No players match
              {state.query.trim()
                ? ` “${state.query.trim().slice(0, 40)}”`
                : ""}
              .
            </strong>
            <br />
            Try a different name or role, or clear the filters.
            <div>
              <button
                type="button"
                className="btn primary"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          roleCounts.map((info, index) => {
            const players = filtered.filter((p) => p.role === info.role);
            if (players.length === 0) return null;
            const headingId = `role-${info.slug}`;
            return (
              <section
                className="section roster-section"
                key={info.role}
                aria-labelledby={headingId}
              >
                <div className="section-head">
                  <h3 id={headingId}>
                    <span className="g-num">
                      {String(index + 1).padStart(2, "0")}
                    </span>{" "}
                    {info.role}
                  </h3>
                  <span className="group-count">
                    {players.length}{" "}
                    {players.length === 1 ? "player" : "players"}
                  </span>
                </div>
                <p className="group-blurb">{info.blurb}</p>
                <ul className="squad-grid" role="list">
                  {players.map((player) => (
                    <li key={player.name}>
                      <PlayerCard
                        player={player}
                        avatar={avatars[player.name]}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </section>
  );
}
