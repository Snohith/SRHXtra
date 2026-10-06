import Link from "next/link";
import Image from "next/image";
import { PlayerCard } from "@/components/squad/PlayerCard";
import { getSquad } from "@/lib/content/squad";
import { getItemListJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { Badge } from "@/components/ui/Badge";

import { assertLiveFranchise, generateFranchiseStaticParams } from "@/lib/content/franchise-route";

export const metadata = buildPageMetadata({
  title: "SRH IPL 2026 Squad — Full Sunrisers Hyderabad Roster",
  description:
    "Complete Sunrisers Hyderabad squad for IPL 2026, grouped by role: batters, wicketkeepers, all-rounders and bowlers with official photos.",
  path: "/sunrisers-hyderabad/squad/",
});

function normalizeRole(role: string) {
  const value = role.toLowerCase();
  if (value.includes("wicket")) return "Wicketkeeper";
  if (value.includes("all")) return "All-rounder";
  if (value.includes("bowl")) return "Bowler";
  return "Batter";
}

const ROLE_ORDER = ["Batter", "Wicketkeeper", "All-rounder", "Bowler"] as const;

const ROLE_META: Record<string, { title: string; index: string; blurb: string }> = {
  Batter: { title: "Batters", index: "01", blurb: "Powerplay destroyers and middle-order anchors" },
  Wicketkeeper: { title: "Wicketkeepers", index: "02", blurb: "Gloves on, finishers at the death" },
  "All-rounder": { title: "All-rounders", index: "03", blurb: "Batting and bowling in the same player" },
  Bowler: { title: "Bowlers", index: "04", blurb: "Quick pace and spin — led by the captain" },
};


export const dynamicParams = false;

export function generateStaticParams() {
  return generateFranchiseStaticParams();
}

export default async function SquadPage({ params }: { params: Promise<{ franchise: string }> }) {
  await assertLiveFranchise(params);
  const squad = getSquad();
  const captainPlayer = squad.players.find((p) => p.captain) ?? null;
  const overseasCount = squad.players.filter((p) => p.nationality !== "Indian").length;

  const grouped = ROLE_ORDER.map((role) => ({
    role,
    ...ROLE_META[role],
    players: squad.players
      .filter((p) => normalizeRole(p.role) === role && !p.captain)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const itemListJsonLd = getItemListJsonLd(
    squad.players.map((player) => ({
      name: `${player.name} — Sunrisers Hyderabad ${player.role}`,
      url: `/sunrisers-hyderabad/squad/${player.slug}/`,
      image: player.image,
    })),
    "/sunrisers-hyderabad/squad/",
  );

  return (
    <div className="page-stack">
      <script
        id="squad-itemlist-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {/* Hero — the Orange Army wall */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[#0d0d0d] text-white shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 90% at 85% 10%, rgba(255,109,0,0.45) 0%, rgba(255,109,0,0) 60%), repeating-linear-gradient(-45deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 14px)",
          }}
        />
        <p
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-6 right-2 select-none text-[5.5rem] font-black uppercase leading-none tracking-tighter text-white/[0.06] sm:-bottom-8 sm:text-[11rem]"
        >
          SRH
        </p>
        <div className="relative z-10 flex flex-col gap-8 px-5 py-10 sm:px-12 sm:py-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge tone="accent" className="border-none bg-[#ff6d00] font-black text-white">
              {`${squad.season} · Orange Army`}
            </Badge>
            <h1 className="mt-5 text-[2rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Rise
              <span className="text-[#ff6d00]">.</span> Roar
              <span className="text-[#ff6d00]">.</span>
              <br />
              <span className="text-transparent [-webkit-text-stroke:2px_#ff6d00]">Repeat.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-white/70 sm:text-base">
              {squad.players.length} players · {overseasCount} overseas · one attacking plan.
              Tap any card for the full profile — batting style, bowling style and career notes.
            </p>
          </div>
          <dl className="grid w-full shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
            {[
              { label: "Players", value: String(squad.players.length) },
              { label: "Overseas", value: String(overseasCount) },
              { label: "Keepers", value: String(grouped[1].players.length) },
              { label: "Bowlers", value: String(grouped[3].players.length + (captainPlayer ? 1 : 0)) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-center backdrop-blur"
              >
                <dd className="text-3xl font-black text-white">{stat.value}</dd>
                <dt className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Leadership chain */}
      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <div className="glass-panel flex items-center gap-4 p-5">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full shadow-inner ring-1 ring-accent/30">
            <Image
              src="/images/leadership/kavya-maran.jpg"
              alt="Kavya Maran — Sunrisers Hyderabad owner"
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff6d00]">Owner</p>
            <p className="truncate text-base font-black uppercase text-foreground">Kavya Maran</p>
            <p className="text-xs font-semibold text-muted">Sunrisers Hyderabad</p>
          </div>
        </div>
        <div className="glass-panel flex items-center gap-4 p-5">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full shadow-inner ring-1 ring-border">
            <Image
              src="/images/leadership/daniel-vettori.jpg"
              alt="Daniel Vettori — Sunrisers Hyderabad head coach"
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted">Head Coach</p>
            <p className="truncate text-base font-black uppercase text-foreground">Daniel Vettori</p>
            <p className="text-xs font-semibold text-muted">Tactics & planning</p>
          </div>
        </div>
        {captainPlayer ? (
          <Link
            href={`/sunrisers-hyderabad/squad/${captainPlayer.slug}/`}
            className="glass-panel group flex items-center gap-4 border-accent/30 p-5 transition-all hover:border-accent"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-accent/40 bg-surface-strong">
              <Image
                src={captainPlayer.image}
                alt={captainPlayer.imageAlt}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff6d00]">
                Captain #{captainPlayer.jerseyNumber ?? "–"}
              </p>
              <p className="truncate text-base font-black uppercase text-foreground transition-colors group-hover:text-accent">
                {captainPlayer.name}
              </p>
              <p className="text-xs font-semibold text-muted">{captainPlayer.role}</p>
            </div>
            <span className="ml-auto text-xl text-accent transition-transform group-hover:translate-x-1">→</span>
          </Link>
        ) : null}
      </section>

      {/* Role units */}
      <div className="flex flex-col gap-14">
        {grouped.map((group) => (
          <section key={group.role}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
              <div className="flex min-w-0 items-baseline gap-3 sm:gap-4">
                <span className="shrink-0 text-4xl font-black tracking-tighter text-accent/25 sm:text-6xl">
                  {group.index}
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
                    {group.title}
                  </h2>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted sm:text-xs">
                    {group.blurb}
                  </p>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-black/[0.05] px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
                {group.players.length + (group.role === "Bowler" && captainPlayer ? 1 : 0)}
              </span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.role === "Bowler" && captainPlayer ? (
                <div className="rounded-[1.25rem] ring-2 ring-[#ff6d00] ring-offset-2 ring-offset-background">
                  <PlayerCard player={captainPlayer} />
                </div>
              ) : null}
              {group.players.map((player) => (
                <PlayerCard key={player.slug} player={player} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mx-auto max-w-2xl text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
        {squad.season} · Photos: official IPL / SRH headshots
      </p>
    </div>
  );
}
