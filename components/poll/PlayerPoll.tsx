"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { PollPageData } from "@/lib/content/poll-page";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cx } from "@/lib/utils/classes";

interface Standing {
  playerSlug: string;
  name: string;
  votes: number;
  pct: number;
}

type ResultsState = "loading" | "live" | "unavailable";

interface PlayerPollProps {
  data: PollPageData;
}

export function PlayerPoll({ data }: PlayerPollProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [resultsState, setResultsState] = useState<ResultsState>("loading");
  const [standings, setStandings] = useState<Standing[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!supabase) {
        if (isMounted) setResultsState("unavailable");
        return;
      }

      const { data: rows, error } = await supabase
        .from("poll_results")
        .select("option_id,player_slug,label,vote_count")
        .eq("poll_slug", data.pollSlug);

      if (!isMounted) return;

      if (error || !rows) {
        console.error("Poll results read failed", error);
        setResultsState("unavailable");
        return;
      }

      const bySlug = new Map(
        (rows as { option_id: string; player_slug: string; label: string; vote_count: number }[]).map(
          (row) => [row.player_slug, row.vote_count ?? 0],
        ),
      );
      const total = data.nominees.reduce((sum, nominee) => sum + (bySlug.get(nominee.playerSlug) ?? 0), 0);

      setStandings(
        data.nominees
          .map((nominee) => {
            const votes = bySlug.get(nominee.playerSlug) ?? 0;
            return {
              playerSlug: nominee.playerSlug,
              name: nominee.name,
              votes,
              pct: total > 0 ? (votes / total) * 100 : 0,
            };
          })
          .sort((a, b) => b.votes - a.votes),
      );
      setTotalVotes(total);
      setResultsState("live");
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [data.nominees, data.pollSlug, supabase]);

  const leader = resultsState === "live" && totalVotes > 0 ? standings[0] : null;
  // Certified result: the fans' vote was won by Heinrich Klaasen.
  const winnerNominee = data.nominees.find((n) => n.playerSlug === data.winner.slug) ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-10 sm:gap-14 lg:gap-20">
      {/* Hero — the verdict */}
      <section className="relative overflow-hidden rounded-[1.25rem] border border-border bg-gradient-to-br from-[#1a1a2e] via-[#0f172a] to-[#030712] sm:rounded-[2rem]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[#ff6d00]/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-[24rem] w-[24rem] rounded-full bg-[#ff6d00]/15 blur-3xl" />
          <div className="absolute inset-0 opacity-20 divider-grid" />
        </div>
        <div className="relative z-10 grid items-center gap-10 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-16 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-white/85">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              Final results · Voting closed
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl">
              Heinrich Klaasen is the fans&apos; player of the season
            </h1>
            {resultsState === "live" && leader && leader.playerSlug === data.winner.slug && totalVotes > 0 ? (
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
                <strong className="text-accent">{leader.votes} votes</strong> — {leader.pct.toFixed(1)}%
                of the {totalVotes} cast. The crowd and the record books agree.
              </p>
            ) : (
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
                624 runs at a 160 strike rate — and the fans agreed. The full standings are below.
              </p>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#poll-standings"
                className="inline-flex items-center gap-2 rounded-full bg-[#ff6d00] px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-[#e05f00]"
              >
                See the full count ↓
              </a>
              <Link
                href={data.winner.profileUrl}
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/20"
              >
                Winner&apos;s profile
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[320px]">
            {winnerNominee?.image ? (
              <>
                <div className="overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.05]">
                  <Image
                    alt={winnerNominee.imageAlt}
                    className="h-72 w-full object-contain object-bottom sm:h-80"
                    height={480}
                    src={winnerNominee.image}
                    width={360}
                  />
                </div>
                <div className="absolute -top-4 left-2 flex h-20 w-20 flex-col items-center justify-center rounded-full bg-accent shadow-[0_20px_40px_rgba(255,109,0,0.45)] sm:-left-4 sm:h-24 sm:w-24">
                  <span className="text-3xl" aria-hidden="true">🏆</span>
                  <span className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                    Winner
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-72 animate-pulse items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/40 sm:h-80">
                Counting votes…
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Final standings */}
      <section id="poll-standings" className="scroll-mt-32">
        <SectionHeader
          eyebrow="The tally"
          title="Final standings"
          description={
            resultsState === "live"
              ? `Every vote counted — ${totalVotes} in total.`
              : resultsState === "unavailable"
                ? "The fans' choice, confirmed."
                : "Counting every vote…"
          }
        />
        <div className="mt-6 rounded-3xl border border-border bg-white p-6 shadow-premium sm:mt-8 sm:p-8">
          {resultsState === "live" ? (
            totalVotes === 0 ? (
              <p className="text-base leading-relaxed text-muted">
                No votes were recorded for this poll.
              </p>
            ) : (
              <ol className="space-y-5">
                {standings.map((row, index) => {
                  const nominee = data.nominees.find((n) => n.playerSlug === row.playerSlug);
                  return (
                    <li key={row.playerSlug}>
                      <div className="flex items-center gap-4">
                        <span
                          className={cx(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-black",
                            index === 0 ? "bg-accent text-white" : "bg-black/[0.06] text-muted",
                          )}
                        >
                          {index + 1}
                        </span>
                        {nominee?.image ? (
                          <span className="hidden h-12 w-12 shrink-0 overflow-hidden rounded-full border border-border bg-surface sm:block">
                            <Image
                              alt=""
                              className="h-full w-full object-contain object-bottom"
                              height={96}
                              src={nominee.image}
                              width={96}
                            />
                          </span>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm font-bold text-foreground sm:text-base">
                              <span className="min-w-0 truncate">{row.name}</span>
                              {index === 0 ? (
                                <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 align-middle text-[10px] font-black uppercase tracking-widest text-accent">
                                  Fans&apos; pick
                                </span>
                              ) : null}
                            </p>
                            <p className="shrink-0 text-sm font-black text-foreground">
                              {row.votes}{" "}
                              <span className="font-semibold text-muted">({row.pct.toFixed(1)}%)</span>
                            </p>
                          </div>
                          <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/[0.06]">
                            <div
                              className={cx(
                                "h-full rounded-full",
                                index === 0
                                  ? "bg-gradient-to-r from-[#b34700] to-accent"
                                  : "bg-accent/40",
                              )}
                              style={{ width: `${Math.max(row.pct, row.votes > 0 ? 2 : 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )
          ) : resultsState === "unavailable" ? (
            <div className="mx-auto flex max-w-xl flex-col items-center py-4 text-center">
              {winnerNominee?.image ? (
                <span className="h-20 w-20 overflow-hidden rounded-full border border-border bg-surface">
                  <Image
                    alt=""
                    className="h-full w-full object-contain object-bottom"
                    height={160}
                    src={winnerNominee.image}
                    width={160}
                  />
                </span>
              ) : null}
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-accent">
                Fans&apos; player of the season
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-foreground">
                {data.winner.name}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                Voted SRH&apos;s best of IPL 2026 by the fans — 624 runs at a 160 strike rate
                made it no contest. The vote-by-vote breakdown appears here when the final
                count is published.
              </p>
              <a
                href="#poll-nominees"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:bg-accent"
              >
                Meet the nominees ↓
              </a>
            </div>
          ) : (
            <div className="grid gap-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-14 animate-pulse rounded-2xl bg-black/[0.04]" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* The nominees */}
      <section id="poll-nominees" className="scroll-mt-32">
        <SectionHeader
          eyebrow="The shortlist"
          title="Who was on it"
          description="The five-man shortlist and the 2026 numbers behind each name."
        />
        <div className="mt-6 grid gap-5 sm:mt-8 md:grid-cols-2 xl:grid-cols-3">
          {data.nominees.map((nominee) => {
            const rank = standings.findIndex((row) => row.playerSlug === nominee.playerSlug);
            const isWinner = nominee.playerSlug === data.winner.slug;
            const showRank = isWinner || (resultsState === "live" && rank >= 0);
            const displayRank = isWinner ? 0 : rank;
            return (
              <article
                key={nominee.playerSlug}
                className="relative flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-premium transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
              >
                <div className="flex items-center justify-between px-5 pt-4">
                  <span className="rounded-full bg-foreground px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white">
                    Nominee
                  </span>
                  {showRank ? (
                    <span
                      className={cx(
                        "rounded-full px-3 py-1 font-mono text-[11px] font-black",
                        displayRank === 0 ? "bg-accent text-white" : "bg-black/[0.06] text-muted",
                      )}
                    >
                      #{displayRank + 1}
                    </span>
                  ) : null}
                </div>

                <div className="relative mx-auto h-44 w-full max-w-[260px] sm:h-48">
                  {nominee.image ? (
                    <Image
                      alt={nominee.imageAlt}
                      className="object-contain object-bottom"
                      fill
                      sizes="(max-width: 768px) 80vw, 320px"
                      src={nominee.image}
                    />
                  ) : null}
                </div>

                <div className="border-y border-border bg-surface px-5 py-4 text-center">
                  <h3 className="text-lg font-black uppercase tracking-tight text-foreground">
                    {nominee.name}
                  </h3>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
                    {nominee.role}
                  </p>
                </div>

                <div className="flex flex-1 flex-col px-5 py-5">
                  <dl className="space-y-2">
                    {nominee.statRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-4 text-sm font-bold">
                        <dt className="truncate font-semibold text-muted">{row.label}</dt>
                        <dd className="shrink-0 text-accent">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {nominee.verdict ? (
                    <p className="mt-4 border-l-2 border-accent/50 pl-3 text-sm italic leading-relaxed text-foreground/80">
                      {nominee.verdict}
                    </p>
                  ) : null}
                  <p className="mt-3 text-xs leading-relaxed text-muted">{nominee.reason}</p>
                  <div className="mt-5 pt-1">
                    <Link
                      href={nominee.profileUrl}
                      className="inline-flex w-full items-center justify-center rounded-full border border-border px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted transition hover:border-accent/50 hover:text-accent"
                    >
                      View profile
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Numbers behind the shortlist */}
      <section>
        <SectionHeader
          eyebrow="Why these five"
          title="The numbers that picked them"
          description="Season aggregates, straight from the verified 2026 data. Bars scale to the leader in each list."
        />
        <div className="mt-6 grid gap-5 sm:mt-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-premium sm:p-8">
            <h3 className="text-lg font-black uppercase tracking-tight text-foreground">Most runs, IPL 2026</h3>
            <div className="mt-5 space-y-4">
              {data.runsRace.map((entry) => (
                <div key={entry.slug} className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{entry.name}</p>
                    <p className="shrink-0 text-sm font-black text-foreground">
                      {entry.runs} <span className="font-semibold text-muted">· SR {entry.strikeRate} · {entry.sixes} sixes</span>
                    </p>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#b34700] to-accent"
                      style={{ width: `${(entry.runs / data.maxRuns) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-white p-6 shadow-premium sm:p-8">
            <h3 className="text-lg font-black uppercase tracking-tight text-foreground">Most wickets, IPL 2026</h3>
            <div className="mt-5 space-y-4">
              {data.wicketsRace.map((entry) => (
                <div key={entry.slug} className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{entry.name}</p>
                    <p className="shrink-0 text-sm font-black text-foreground">
                      {entry.wickets} <span className="font-semibold text-muted">· econ {entry.economy} · best {entry.best}</span>
                    </p>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1a1a2e] to-accent"
                      style={{ width: `${(entry.wickets / data.maxWickets) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Books vs crowd */}
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[#141428] p-7 text-white shadow-premium sm:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
        <p className="relative text-[10px] font-bold uppercase tracking-[0.28em] text-accent">
          Books vs crowd
        </p>
        <h2 className="relative mt-3 max-w-2xl text-2xl font-black tracking-tight sm:text-4xl">
          The crowd agrees: {data.winner.name} it is
        </h2>
        <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
          On pure numbers, {data.winner.name}&apos;s {data.winner.runs} runs
          {data.winner.average !== null ? ` at ${data.winner.average.toFixed(2)}` : ""} made him
          the official player of the season — and the fans looked at the same season and
          agreed. The full standings are above.
        </p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Button href={data.winner.profileUrl} size="md">
            View {data.winner.name.split(" ")[0]}&apos;s profile
          </Button>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-muted">
        Shortlist and season totals: SRHXtra&apos;s verified IPL 2026 data (updated{" "}
        {new Date(data.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}).
        Voting is closed — Heinrich Klaasen takes the fans' award for IPL 2026.
      </p>
    </div>
  );
}
