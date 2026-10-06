import Link from "next/link";

const BALLS_FACED = 32;
const FOURS = 7;
const SIX_COUNT = 7;
const BOUNDARY_RUNS = 70;
const TOTAL_RUNS = 82;
const OTHER_BALLS = BALLS_FACED - FOURS - SIX_COUNT; // 18
const RUNNING_RUNS = TOTAL_RUNS - BOUNDARY_RUNS; // 12
const STRIKE_RATE = ((TOTAL_RUNS / BALLS_FACED) * 100).toFixed(2);

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent">{children}</p>
  );
}

/** Dark broadcast-style result strip. */
export function ResultStrip() {
  return (
    <section
      aria-label="Match result"
      className="relative overflow-hidden rounded-[1.75rem] bg-[#141428] text-white shadow-premium"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-[#ff6d00]/20 blur-3xl"
      />
      <div className="relative grid gap-6 p-5 sm:p-10">
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.28em] text-white/60">
          <span className="rounded-full bg-accent px-3 py-1 text-white">1st T20I · Delhi</span>
          <span>India vs Afghanistan</span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/30" />
          <span>Series opener</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 max-w-xl">
            <p className="break-words text-3xl font-black tracking-tight min-[480px]:text-4xl sm:text-6xl">
              India win <span className="text-accent">by 7 wickets</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
              Abhishek Sharma made 82 off 32 balls and put on 121 with Ishan Kishan (42) as India
              chased it down with seven wickets to spare in Delhi.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-3">
            {[
              { k: "Abhishek", v: "82 (32)" },
              { k: "Kishan", v: "42" },
              { k: "Partnership", v: "121" },
            ].map((stat) => (
              <div
                key={stat.k}
                className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur last:col-span-1 min-[480px]:last:col-span-2 sm:last:col-span-1"
              >
                <dt className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                  {stat.k}
                </dt>
                <dd className="mt-1 break-words text-2xl font-black tracking-tight">{stat.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/** Four quick-read stat tiles. */
export function KeyNumbers() {
  const tiles = [
    { value: STRIKE_RATE, label: "Strike rate", hint: "82 off 32 balls" },
    { value: "85.4%", label: "Runs in boundaries", hint: "70 of his 82 in fours and sixes" },
    { value: "14/32", label: "Balls to the fence", hint: "7 fours · 7 sixes" },
    { value: "121", label: "Partnership", hint: "Abhishek and Kishan together" },
  ];

  return (
    <section aria-label="Key numbers" id="key-numbers" className="grid scroll-mt-32 grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="group min-w-0 rounded-3xl border border-border bg-white p-5 shadow-premium transition duration-300 hover:-translate-y-1 hover:border-accent/40 sm:p-6"
        >
          <p className="break-words text-2xl font-black tracking-tight text-foreground sm:text-4xl">
            {tile.value}
          </p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
            {tile.label}
          </p>
          <p className="mt-1 text-xs text-muted sm:text-sm">{tile.hint}</p>
        </div>
      ))}
    </section>
  );
}

/** Where the 82 came from — stacked boundary anatomy bar. */
export function BoundaryAnatomy() {
  const sixPct = ((SIX_COUNT * 6) / TOTAL_RUNS) * 100;
  const fourPct = ((FOURS * 4) / TOTAL_RUNS) * 100;
  const runPct = (RUNNING_RUNS / TOTAL_RUNS) * 100;

  return (
    <section
      aria-label="Where the 82 came from"
      id="boundary-anatomy"
      className="scroll-mt-32 rounded-[1.75rem] border border-border bg-white p-5 shadow-premium sm:p-10"
    >
      <Eyebrow>Where the runs came from</Eyebrow>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
        Seventy of his 82 came in boundaries
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        Seven fours, seven sixes — and only 12 runs he actually had to run for.
      </p>

      <div
        role="img"
        aria-label="Abhishek Sharma's 82: 42 runs in sixes, 28 in fours, 12 run between the wickets"
        className="mt-6 flex h-14 w-full overflow-hidden rounded-2xl border border-border sm:h-16"
      >
        <div
          className="flex min-w-0 items-center justify-center truncate bg-gradient-to-r from-[#b34700] to-accent px-1 text-[11px] font-black text-white sm:text-sm"
          style={{ width: `${sixPct}%` }}
        >
          <span className="truncate">6s · 42</span>
        </div>
        <div
          className="flex min-w-0 items-center justify-center truncate bg-[#ff8f3d] px-1 text-[11px] font-black text-white sm:text-sm"
          style={{ width: `${fourPct}%` }}
        >
          <span className="truncate">4s · 28</span>
        </div>
        <div
          className="flex min-w-0 items-center justify-center truncate bg-surface-strong px-1 text-[11px] font-black text-muted sm:text-sm"
          style={{ width: `${runPct}%` }}
        >
          <span className="truncate">Run · 12</span>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 text-xs text-muted sm:grid-cols-3 sm:text-sm">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-accent" />
          Sixes — 42 runs (51.2%)
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#ff8f3d]" />
          Fours — 28 runs (34.1%)
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          Between the wickets — 12 runs (14.6%)
        </li>
      </ul>
    </section>
  );
}

/** 32-ball dot map: every ball Abhishek faced, visualised. */
export function BallMap() {
  const balls = Array.from({ length: BALLS_FACED }, (_, i) => {
    if (i < SIX_COUNT) return "six";
    if (i < SIX_COUNT + FOURS) return "four";
    return "other";
  });

  return (
    <section
      aria-label="Ball-by-ball map"
      id="ball-map"
      className="scroll-mt-32 rounded-[1.75rem] border border-border bg-white p-5 shadow-premium sm:p-10"
    >
      <Eyebrow>Ball map · 32 balls faced</Eyebrow>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
        Fourteen balls went to the fence
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
        The other 18 balls went for 12 runs between the wickets. The report never says how many
        of those were dots, singles or twos — so neither do we.
      </p>

      <div className="mt-6 grid grid-cols-8 gap-2 sm:grid-cols-[repeat(16,minmax(0,1fr))] sm:gap-2.5" role="img" aria-label="Dot map: 7 sixes, 7 fours and 18 other balls without a boundary across 32 deliveries">
        {balls.map((ball, index) => (
          <span
            key={index}
            title={ball === "six" ? "Six" : ball === "four" ? "Four" : "No boundary — dot or run between the wickets"}
            className={
              ball === "six"
                ? "flex aspect-square items-center justify-center rounded-full bg-foreground text-[10px] font-black text-white"
                : ball === "four"
                  ? "flex aspect-square items-center justify-center rounded-full bg-accent text-[10px] font-black text-white"
                  : "aspect-square rounded-full border border-border bg-surface"
            }
          >
            {ball === "six" ? "6" : ball === "four" ? "4" : ""}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted sm:text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[9px] font-black text-white">6</span>
          Six × 7
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-black text-white">4</span>
          Four × 7
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-5 w-5 rounded-full border border-border bg-surface" />
          Everything else × 18 (12 runs)
        </span>
      </div>
      <p className="mt-4 text-xs italic leading-relaxed text-muted">
        Grouped for illustration — the report gives the totals, not the ball-by-ball order.
      </p>
    </section>
  );
}

/** Pull quote from the post-match reaction. */
export function PullQuote() {
  return (
    <figure id="pull-quote" className="relative scroll-mt-32 overflow-hidden rounded-[1.75rem] border-l-4 border-accent bg-gradient-to-br from-accent-soft via-white to-white px-6 py-8 shadow-premium sm:px-12 sm:py-14">
      <span aria-hidden="true" className="absolute left-5 top-3 font-serif text-7xl leading-none text-accent/20">“</span>
      <blockquote className="relative text-2xl font-black leading-snug tracking-tight text-foreground sm:text-4xl">
        The approach doesn&apos;t change.
      </blockquote>
      <figcaption className="relative mt-4 text-xs font-bold uppercase tracking-[0.22em] text-muted sm:text-sm">
        Abhishek Sharma — speaking to the ICC after the win
      </figcaption>
    </figure>
  );
}

/** How the evening unfolded. */
export function StoryTimeline() {
  const steps = [
    {
      time: "Before a ball was bowled",
      title: "Short of runs, not short of intent",
      body: "Abhishek came into this series light on T20I runs. Rather than play himself back into form, he hit his way out of it.",
    },
    {
      time: "Then the hitting started",
      title: "82 off 32 balls",
      body: "Seven fours, seven sixes, strike rate 256.25. The chase was as good as done before Afghanistan could slow it down.",
    },
    {
      time: "At No. 3",
      title: "Kishan held the other end",
      body: "42 from a man who usually opens, sent in after the powerplay to keep a left-hander at the crease. Straight out of Hyderabad's book.",
    },
    {
      time: "The finish",
      title: "Seven wickets spare in Delhi",
      body: "India wrapped it up with seven wickets in hand and took the series lead. Abhishek, Kishan and Nitish Kumar Reddy all stay on for the Asian Games squad.",
    },
  ];

  return (
    <section
      aria-label="How the match happened"
      id="how-it-happened"
      className="scroll-mt-32 rounded-[1.75rem] border border-border bg-white p-5 shadow-premium sm:p-10"
    >
      <Eyebrow>In short</Eyebrow>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
        How it happened
      </h2>
      <ol className="mt-8 grid gap-0">
        {steps.map((step, index) => (
          <li key={step.title} className="relative grid gap-2 pb-8 pl-12 last:pb-0 sm:pl-14">
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="absolute bottom-0 left-[19px] top-12 w-px bg-gradient-to-b from-accent/60 to-border sm:left-[23px]" />
            ) : null}
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-black text-white sm:h-12 sm:w-12 sm:text-base"
            >
              {index + 1}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-accent">{step.time}</p>
            <h3 className="text-lg font-black tracking-tight text-foreground sm:text-xl">{step.title}</h3>
            <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** SRH-lens context card. */
export function SrhLens() {
  return (
    <section
      aria-label="What it means for SRH"
      id="srh-lens"
      className="relative scroll-mt-32 overflow-hidden rounded-[1.75rem] border border-accent/25 bg-gradient-to-br from-[#1a1a2e] to-[#2b1a10] p-5 text-white shadow-premium sm:p-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/25 blur-3xl"
      />
      <Eyebrow>The SRH angle</Eyebrow>
      <h2 className="relative mt-3 text-2xl font-black tracking-tight sm:text-3xl">
        What it means for Hyderabad
      </h2>
      <div className="relative mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">Abhishek Sharma</p>
          <p className="mt-2 text-3xl font-black">82 <span className="text-base font-bold text-white/60">(32)</span></p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            No feeling his way back into form — 82 off 32 is how he answers a lean patch.
            Anyone who watched SRH this year has seen this film before.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent">Ishan Kishan · No. 3</p>
          <p className="mt-2 text-3xl font-black">42</p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Opens for most sides, floats for India. Batting wherever the matchup suits is
            exactly how Hyderabad use him too.
          </p>
        </div>
      </div>
      <p className="relative mt-5 text-sm leading-relaxed text-white/70">
        Abhishek, Kishan and Nitish Kumar Reddy are all in India&apos;s Asian Games group —
        national-team form, straight back into orange.
      </p>
    </section>
  );
}

/** Source + continued-reading footer. */
export function SourceFooter({ sourceName, sourceUrl }: { sourceName?: string; sourceUrl?: string }) {
  if (!sourceName || !sourceUrl) return null;

  return (
    <section
      aria-label="Sources and further reading"
      className="flex flex-col gap-4 rounded-[1.75rem] border border-border bg-surface p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Scores & quotes via</p>
        <p className="mt-1 text-lg font-black tracking-tight text-foreground">{sourceName}</p>
      </div>
      <Link
        href={sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:bg-accent"
      >
        Read the {sourceName} report →
      </Link>
    </section>
  );
}
