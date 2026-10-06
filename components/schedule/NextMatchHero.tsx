"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getTeamInfo } from "@/lib/utils/team-info";
import type { Fixture } from "@/lib/content/schedule";
import { cx } from "@/lib/utils/classes";

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function NextMatchHero({ fixture }: { fixture: Fixture }) {
  const opponent = getTeamInfo(fixture.opponent);
  const srh = getTeamInfo("SRH");
  const isCompleted = fixture.status === "completed" || Boolean(fixture.result);
  const reportHref = fixture.reportSlug ? `/sunrisers-hyderabad/match-coverage/${fixture.reportSlug}/` : null;
  
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (isCompleted) {
      setCountdown(null);
      setIsLive(false);
      return;
    }

    // Parse the date (YYYY-MM-DD) and time (HH:mm IST)
    const [timeStr] = fixture.time.split(" ");
    const targetDate = new Date(`${fixture.date}T${timeStr}:00+05:30`);

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsLive(true);
        return;
      }

      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fixture, isCompleted]);

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleActionClick = () => {
    if (isCompleted) {
      setMessage("The report for this game isn't up yet");
      return;
    }

    if (isLive) {
      setMessage("Live scores aren't on this site — check the IPL app");
    } else {
      setMessage("The preview goes up about 4 hours before the game");
    }
  };

  const isHome = fixture.homeAway === "home";
  const leftTeam = isHome ? srh : opponent;
  const rightTeam = isHome ? opponent : srh;

  return (
    <section className={cx(
      "relative overflow-hidden rounded-[1.5rem] bg-surface-strong px-5 py-8 transition-all duration-1000 sm:rounded-3xl sm:px-10 sm:py-10 lg:py-12",
      isLive ? "ring-2 ring-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]" : "",
      isCompleted ? "ring-1 ring-emerald-500/15" : "",
    )}>
      {/* Background Glow */}
      <div className={cx(
        "absolute -top-24 -right-24 h-96 w-96 rounded-full blur-[120px] transition-colors duration-1000",
        isLive ? "bg-rose-500/20" : isCompleted ? "bg-emerald-500/10" : "bg-accent/20"
      )} />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent">
            {isCompleted ? "Latest Result" : "Next Encounter"}
          </p>
          {isLive && (
            <div className="flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Match Live</span>
            </div>
          )}
          {isCompleted && (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Match Completed</span>
            </div>
          )}
        </div>
        
        <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-10">
          {/* Home/Away Side 1 */}
          <div className="flex flex-col items-center gap-4">
            <div className={cx(
              "relative h-20 w-20 sm:h-24 sm:w-24 transition-all duration-1000",
              isLive && leftTeam.code === "SRH" ? "scale-110 drop-shadow-[0_0_15px_rgba(255,109,0,0.25)]" : "",
              isLive && leftTeam.code !== "SRH" ? "scale-110 drop-shadow-[0_0_15px_rgba(0,0,0,0.06)]" : ""
            )}>
              {leftTeam.logo && (
                <Image
                  src={leftTeam.logo}
                  alt={`${leftTeam.name} Logo`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>
            <span className="text-xl font-black text-foreground">{leftTeam.code}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-2xl font-black italic text-muted/20">VS</span>
          </div>

          {/* Home/Away Side 2 */}
          <div className="flex flex-col items-center gap-4">
            <div className={cx(
              "relative h-20 w-20 sm:h-24 sm:w-24 transition-all duration-1000",
              isLive && rightTeam.code === "SRH" ? "scale-110 drop-shadow-[0_0_15px_rgba(255,109,0,0.25)]" : "",
              isLive && rightTeam.code !== "SRH" ? "scale-110 drop-shadow-[0_0_15px_rgba(0,0,0,0.06)]" : ""
            )}>
              {rightTeam.logo && (
                <Image
                  src={rightTeam.logo}
                  alt={`${rightTeam.name} Logo`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>
            <span className="text-xl font-black text-foreground">{rightTeam.code}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
            {isLive ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <span className="text-center text-3xl font-black tracking-tighter text-foreground animate-pulse sm:text-4xl">GAME IN PROGRESS</span>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">No live scores here — follow the IPL feed</p>
              </div>
            ) : isCompleted ? (
              <div className="flex max-w-2xl flex-col items-center gap-4 py-4">
                <span className="text-center text-3xl font-black tracking-tighter text-foreground sm:text-4xl">MATCH COMPLETED</span>
                {fixture.result && (
                  <p className="text-base font-black text-accent sm:text-lg">{fixture.result}</p>
                )}
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Final Result</p>
              </div>
            ) : countdown ? (
              <>
                <TimeUnit value={countdown.days} label="Days" />
                <TimeUnit value={countdown.hours} label="Hours" />
                <TimeUnit value={countdown.minutes} label="Mins" />
                <TimeUnit value={countdown.seconds} label="Secs" />
              </>
            ) : (
              <div className="h-16 w-48 animate-pulse rounded-xl bg-black/[0.04]" />
            )}
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-base font-bold text-foreground sm:text-lg">{fixture.date} • {fixture.time}</p>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">{fixture.venue}</p>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-4">
              {isCompleted && reportHref ? (
                <Link
                  href={reportHref}
                  className="w-full rounded-full border border-accent bg-accent px-8 py-3 text-center text-sm font-bold text-white transition-all duration-500 hover:bg-accent/90 sm:w-auto sm:px-10"
                >
                  Match Report
                </Link>
              ) : (
                <button 
                  onClick={handleActionClick}
                  className={cx(
                    "w-full rounded-full border px-8 py-3 text-sm font-bold transition-all duration-500 sm:w-auto sm:px-10",
                    isLive 
                      ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                      : isCompleted
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15"
                        : "border-border bg-black/[0.04] text-foreground hover:bg-black/[0.08] hover:border-accent/40 hover:text-accent"
                  )}
                >
                  {isLive ? "Match Center" : isCompleted ? "Match Completed" : "Match Preview"}
                </button>
              )}
            </div>
            
            {message && (
              <p className="animate-fade-in text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-black/[0.04] text-xl font-black text-foreground sm:h-16 sm:w-16 sm:text-2xl">
        {value.toString().padStart(2, "0")}
      </div>
      <span className="mt-2 text-[8px] font-bold uppercase tracking-widest text-muted">{label}</span>
    </div>
  );
}
