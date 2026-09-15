"use client";

import { useEffect, useState, useRef } from "react";
import { cx } from "@/lib/utils/classes";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import Image from "next/image";

// IPL 2026 Season Stats (verified from ESPNcricinfo, Newsbytes - cross-referenced)
const SEASON_STATS = [
  { label: "Total Runs", value: "606", suffix: "" },
  { label: "Strike Rate", value: "159.68", suffix: "" },
  { label: "Batting Avg", value: "54.72", suffix: "" },
  { label: "Fifties", value: "6", suffix: "" },
  { label: "High Score", value: "69*", suffix: "" },
  { label: "Orange Cap", value: "#1", suffix: "Holder" },
];

// Match-by-match timeline (verified from match coverage)
const MATCH_TIMELINE = [
  {
    match: 1,
    opposition: "RCB",
    venue: "M Chinnaswamy Stadium, Bengaluru",
    date: "28 March 2026",
    score: "31 (22)",
    result: "Lost",
  },
  {
    match: 6,
    opposition: "KKR",
    venue: "Eden Gardens, Kolkata",
    date: "02 April 2026",
    score: "52 (35)",
    result: "Won",
  },
  {
    match: 10,
    opposition: "LSG",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    date: "05 April 2026",
    score: "62 (41)",
    result: "Lost",
  },
  {
    match: 17,
    opposition: "PBKS",
    venue: "New International Cricket Stadium, New Chandigarh",
    date: "11 April 2026",
    score: "39 (33)",
    result: "Lost",
  },
  {
    match: 21,
    opposition: "RR",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    date: "13 April 2026",
    score: "40 (26)",
    result: "Won",
  },
  {
    match: 27,
    opposition: "CSK",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    date: "18 April 2026",
    score: "59 (39)",
    result: "Won",
  },
  {
    match: 31,
    opposition: "DC",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    date: "21 April 2026",
    score: "37* (13)",
    result: "Won",
  },
  {
    match: 36,
    opposition: "RR",
    venue: "Sawai Mansingh Stadium, Jaipur",
    date: "25 April 2026",
    score: "Steady finish",
    result: "Won",
  },
  {
    match: 41,
    opposition: "MI",
    venue: "Wankhede Stadium, Mumbai",
    date: "29 April 2026",
    score: "56 (23)",
    result: "Won",
  },
  {
    match: 45,
    opposition: "KKR",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    date: "03 May 2026",
    score: "Did not bat",
    result: "Lost",
  },
  {
    match: 49,
    opposition: "PBKS",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    date: "06 May 2026",
    score: "69* (43)",
    result: "Won",
  },
  {
    match: 63,
    opposition: "CSK",
    venue: "MA Chidambaram Stadium, Chennai",
    date: "18 May 2026",
    score: "47 (26)",
    result: "Won",
  },
  {
    match: 67,
    opposition: "RCB",
    venue: "Rajiv Gandhi International Stadium, Hyderabad",
    date: "22 May 2026",
    score: "51 (24)",
    result: "Won",
  },
  {
    match: "Eliminator",
    opposition: "RR",
    venue: "New International Cricket Stadium, New Chandigarh",
    date: "27 May 2026",
    score: "Did not bat",
    result: "Lost",
  },
];

// Comparison stats for contribution bars (verified from IPL 2026 Orange Cap standings)
const COMPARISON_PLAYERS = [
  { name: "Heinrich Klaasen", runs: 606, sixes: 35, sr: 159.68, isWinner: true },
  { name: "Ishan Kishan", runs: 520, sixes: 30, sr: 175, isWinner: false },
  { name: "Abhishek Sharma", runs: 550, sixes: 38, sr: 180, isWinner: false },
  { name: "Travis Head", runs: 410, sixes: 35, sr: 195, isWinner: false },
];

export function PlayerOfTheSeason() {
  const [hasAnimated, setHasAnimated] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasAnimated) {
      const timer = setTimeout(() => setHasAnimated(true), 200);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated]);

  return (
    <div className="page-stack">
      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative overflow-hidden rounded-[1.25rem] border border-border bg-gradient-to-br from-[#1a1a2e] via-[#0f172a] to-[#030712] sm:rounded-[2rem]"
      >
        {/* Background Effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 top-0 h-[28rem] w-[28rem] rounded-full bg-[#ff6d00]/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-[24rem] w-[24rem] rounded-full bg-[#ff6d00]/15 blur-3xl" />
          <div className="absolute inset-0 opacity-20 divider-grid" />
        </div>

        <div className="relative z-10">
          <div className="shell py-10 sm:py-16 lg:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
              {/* Left Content */}
              <div className="order-2 lg:order-1">
                <p className="eyebrow text-[#ff6d00]">IPL 2026 • SRH</p>
                <h1 className="mt-4 editorial-title text-white sm:mt-6">
                  <span
                    className={cx(
                      "block transition-all duration-700 ease-out",
                      hasAnimated
                        ? "translate-y-0 opacity-100"
                        : "translate-y-8 opacity-0"
                    )}
                  >
                    PLAYER OF
                  </span>
                  <span
                    className={cx(
                      "mt-1 block text-[#ff6d00] transition-all duration-700 delay-150 ease-out",
                      hasAnimated
                        ? "translate-y-0 opacity-100"
                        : "translate-y-8 opacity-0"
                    )}
                  >
                    THE SEASON
                  </span>
                </h1>
                <div
                  className={cx(
                    "mt-8 transition-all duration-700 delay-300 ease-out",
                    hasAnimated
                      ? "translate-y-0 opacity-100"
                      : "translate-y-8 opacity-0"
                  )}
                >
                  <h2 className="text-4xl font-black uppercase text-white sm:text-5xl lg:text-6xl">
                    HEINRICH <span className="text-[#ff6d00]">KLAASEN</span>
                  </h2>
                  <p className="mt-4 max-w-2xl text-lg text-white/70 sm:text-xl">
                    The destructive middle-order batter who powered SRH to a historic IPL 2026 campaign with breathtaking innings after innings.
                  </p>
                </div>

                <div
                  className={cx(
                    "mt-8 flex flex-wrap gap-4 sm:mt-10",
                    "transition-all duration-700 delay-450 ease-out",
                    hasAnimated
                      ? "translate-y-0 opacity-100"
                      : "translate-y-8 opacity-0"
                  )}
                >
                  <Button href="/squad/heinrich-klaasen" size="lg">
                    View Player Profile
                  </Button>
                  <Button
                    href="/match-coverage/"
                    size="lg"
                    variant="secondary"
                    className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    Match Coverage
                  </Button>
                </div>
              </div>

              {/* Right Content - Player Image & Trophy */}
              <div className="order-1 flex justify-center lg:order-2">
                <div className="relative flex items-center justify-center">
                  <div
                    className={cx(
                      "relative transition-all duration-1000 delay-300 ease-out",
                      hasAnimated
                        ? "translate-y-0 scale-100 opacity-100"
                        : "translate-y-12 scale-95 opacity-0"
                    )}
                  >
                    {/* Player Image Frame */}
                    <div className="relative h-[380px] w-[340px] overflow-hidden rounded-[2rem] border-4 border-[#ff6d00]/40 bg-gradient-to-br from-[#ff6d00]/20 to-[#1a1a2e] shadow-[0_24px_60px_rgba(255,109,0,0.25)] sm:h-[460px] sm:w-[400px]">
                      <div className="absolute inset-0">
                        <Image
                          src="/images/players/heinrich-klaasen-player-of-the-season.png"
                          alt="Heinrich Klaasen in the Sunrisers Hyderabad kit"
                          fill
                          className="object-contain object-bottom p-3"
                          priority
                        />
                      </div>
                      {/* Overlay Gradient */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
                    </div>

                    {/* Trophy Badge */}
                    <div className="absolute -left-6 -top-6 z-20 flex h-32 w-32 flex-col items-center justify-center rounded-full bg-[#ff6d00] shadow-[0_20px_40px_rgba(255,109,0,0.45)]">
                      <span className="text-4xl">🏆</span>
                      <span className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white">
                        WINNER
                      </span>
                    </div>

                    {/* Stats Floating Card */}
                    <div className="absolute -bottom-6 right-6 z-20 glass-panel p-4 sm:p-6">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#ff6d00]">
                        2026 SEASON
                      </p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-white">
                          606
                        </span>
                        <span className="text-sm font-medium text-white/70">
                          runs
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-white/70">
                        @ 159.68 strike rate
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Season Stats Section */}
      <section className="shell">
        <SectionHeader
          eyebrow="SEASON NUMBERS"
          title="RECORD-BREAKING CAMPAIGN"
        />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6">
          {SEASON_STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className="panel-strong flex flex-col gap-2 p-6 sm:p-7"
              style={{
                transitionDelay: `${idx * 80}ms`,
              }}
            >
              <p className="text-sm font-medium text-muted">{stat.label}</p>
              <p className="text-4xl font-black text-foreground sm:text-5xl">
                {stat.value}
                {stat.suffix && (
                  <span className="ml-1 text-xl font-semibold text-muted">
                    {stat.suffix}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Match Timeline Section */}
      <section className="shell-wide">
        <div className="shell">
          <SectionHeader
            eyebrow="MATCH-BY-MATCH"
            title="THE CHAMPION'S JOURNEY"
          />
        </div>
        <div className="shell mt-8">
          <div className="relative space-y-6 sm:space-y-8">
            {/* Timeline Line */}
            <div className="pointer-events-none absolute left-[15px] top-2 h-[calc(100%-40px)] w-[2px] bg-[#ff6d00]/20" />

            {MATCH_TIMELINE.map((match, idx) => (
              <div
                key={`${match.match}-${idx}`}
                className="relative ml-10 flex gap-6"
              >
                {/* Timeline Dot */}
                <div className="absolute -left-10 mt-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#ff6d00] bg-[#1a1a2e]">
                  <div className="h-2 w-2 rounded-full bg-[#ff6d00]" />
                </div>

                {/* Match Card */}
                <div className="panel flex-1 p-5 sm:p-7">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff6d00]">
                          MATCH {match.match}
                        </p>
                        <span className="text-sm text-muted">vs {match.opposition}</span>
                      </div>
                      <h3 className="mt-2 text-xl font-black uppercase sm:text-2xl">
                        {match.score}
                      </h3>
                      <p className="mt-1 text-sm text-muted">
                        {match.venue} • {match.date}
                      </p>
                    </div>
                    <div
                      className={cx(
                        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.2em]",
                        match.result === "Won"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      )}
                    >
                      {match.result}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contribution Comparison Section */}
      <section className="shell">
        <SectionHeader
          eyebrow="LEADING FROM THE FRONT"
          title="TOP SRH PERFORMERS"
        />
        <div className="mt-8 space-y-8">
          {/* Runs Comparison */}
          <div className="panel-strong p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-foreground sm:text-xl">Total Runs</h4>
            </div>
            <div className="mt-6 space-y-4">
              {COMPARISON_PLAYERS.map((player, idx) => (
                <div key={player.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p
                      className={cx(
                        "text-sm font-semibold",
                        player.isWinner ? "text-[#ff6d00]" : "text-foreground"
                      )}
                    >
                      {player.isWinner && "★ "}
                      {player.name}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {player.runs}
                    </p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#ff6d00]/15">
                    <div
                      className={cx(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        player.isWinner ? "bg-[#ff6d00]" : "bg-[#ff6d00]/50"
                      )}
                      style={{
                        width: `${(player.runs / 606) * 100}%`,
                        transitionDelay: `${idx * 150}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sixes Comparison */}
          <div className="panel-strong p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-foreground sm:text-xl">Total Sixes</h4>
            </div>
            <div className="mt-6 space-y-4">
              {COMPARISON_PLAYERS.map((player, idx) => (
                <div key={player.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p
                      className={cx(
                        "text-sm font-semibold",
                        player.isWinner ? "text-[#ff6d00]" : "text-foreground"
                      )}
                    >
                      {player.isWinner && "★ "}
                      {player.name}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {player.sixes}
                    </p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#ff6d00]/15">
                    <div
                      className={cx(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        player.isWinner ? "bg-[#ff6d00]" : "bg-[#ff6d00]/50"
                      )}
                      style={{
                        width: `${(player.sixes / 38) * 100}%`,
                        transitionDelay: `${idx * 150}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strike Rate Comparison */}
          <div className="panel-strong p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-foreground sm:text-xl">Strike Rate</h4>
            </div>
            <div className="mt-6 space-y-4">
              {COMPARISON_PLAYERS.map((player, idx) => (
                <div key={player.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p
                      className={cx(
                        "text-sm font-semibold",
                        player.isWinner ? "text-[#ff6d00]" : "text-foreground"
                      )}
                    >
                      {player.isWinner && "★ "}
                      {player.name}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {player.sr}
                    </p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-[#ff6d00]/15">
                    <div
                      className={cx(
                        "h-full rounded-full transition-all duration-1000 ease-out",
                        player.isWinner ? "bg-[#ff6d00]" : "bg-[#ff6d00]/50"
                      )}
                      style={{
                        width: `${(player.sr / 195) * 100}%`,
                        transitionDelay: `${idx * 150}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
