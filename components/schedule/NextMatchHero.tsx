"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  
  const [countdown, setCountdown] = useState<CountdownState | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
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
  }, [fixture]);

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleActionClick = () => {
    if (isLive) {
      setMessage("Match Center will be available soon");
    } else {
      setMessage("Preview available before 4 hrs from start of game");
    }
  };

  const isHome = fixture.homeAway === "home";
  const leftTeam = isHome ? srh : opponent;
  const rightTeam = isHome ? opponent : srh;

  return (
    <section className={cx(
      "relative overflow-hidden rounded-3xl bg-surface-strong px-8 py-16 sm:px-12 lg:py-20 transition-all duration-1000",
      isLive ? "ring-2 ring-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.1)]" : ""
    )}>
      {/* Background Glow */}
      <div className={cx(
        "absolute -top-24 -right-24 h-96 w-96 rounded-full blur-[120px] transition-colors duration-1000",
        isLive ? "bg-rose-500/20" : "bg-accent/20"
      )} />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="flex flex-col items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-accent">Next Encounter</p>
          {isLive && (
            <div className="flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/20 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Match Live</span>
            </div>
          )}
        </div>
        
        <div className="mt-12 flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-16">
          {/* Home/Away Side 1 */}
          <div className="flex flex-col items-center gap-4">
            <div className={cx(
              "relative h-20 w-20 sm:h-24 sm:w-24 transition-all duration-1000",
              isLive && leftTeam.code === "SRH" ? "scale-110 drop-shadow-[0_0_15px_rgba(255,130,0,0.3)]" : "",
              isLive && leftTeam.code !== "SRH" ? "scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" : ""
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
            <span className="text-xl font-black text-white">{leftTeam.code}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-2xl font-black italic text-muted/20">VS</span>
          </div>

          {/* Home/Away Side 2 */}
          <div className="flex flex-col items-center gap-4">
            <div className={cx(
              "relative h-20 w-20 sm:h-24 sm:w-24 transition-all duration-1000",
              isLive && rightTeam.code === "SRH" ? "scale-110 drop-shadow-[0_0_15px_rgba(255,130,0,0.3)]" : "",
              isLive && rightTeam.code !== "SRH" ? "scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" : ""
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
            <span className="text-xl font-black text-white">{rightTeam.code}</span>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-8">
          <div className="flex gap-2 sm:gap-4">
            {isLive ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <span className="text-4xl font-black tracking-tighter text-white animate-pulse">GAME IN PROGRESS</span>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Tracking Official Scoreboard</p>
              </div>
            ) : countdown ? (
              <>
                <TimeUnit value={countdown.days} label="Days" />
                <TimeUnit value={countdown.hours} label="Hours" />
                <TimeUnit value={countdown.minutes} label="Mins" />
                <TimeUnit value={countdown.seconds} label="Secs" />
              </>
            ) : (
              <div className="h-16 w-48 animate-pulse rounded-xl bg-white/5" />
            )}
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-lg font-bold text-white">{fixture.date} • {fixture.time}</p>
            <p className="text-xs font-medium text-muted uppercase tracking-wider">{fixture.venue}</p>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={handleActionClick}
                className={cx(
                  "rounded-full border px-10 py-3 text-sm font-bold transition-all duration-500",
                  isLive 
                    ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-accent/40 hover:text-accent"
                )}
              >
                {isLive ? "Match Center" : "Match Preview"}
              </button>
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
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 text-xl font-black text-white sm:h-16 sm:w-16 sm:text-2xl">
        {value.toString().padStart(2, "0")}
      </div>
      <span className="mt-2 text-[8px] font-bold uppercase tracking-widest text-muted">{label}</span>
    </div>
  );
}
