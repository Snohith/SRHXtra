"use client";

import { useState } from "react";
import { cx } from "@/lib/utils/classes";
import { FixtureCard } from "./FixtureCard";
import { ScheduleTable } from "./ScheduleTable";
import type { Fixture } from "@/lib/content/schedule";

interface ScheduleTabsProps {
  upcoming: Fixture[];
  completed: Fixture[];
  full: Fixture[];
}

export function ScheduleTabs({ upcoming, completed, full }: ScheduleTabsProps) {
  const [activeTab, setActiveTab] = useState<"results" | "upcoming" | "full">("results");

  const tabs = [
    { id: "results", label: "Results", count: completed.length },
    { id: "upcoming", label: "Upcoming", count: upcoming.length },
    { id: "full", label: "All Games", count: full.length },
  ] as const;

  return (
    <div className="space-y-7 sm:space-y-12">
      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cx(
              "relative flex min-h-11 items-center justify-center gap-3 rounded-full px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] transition-all sm:px-6 sm:text-xs sm:tracking-widest",
              activeTab === tab.id
                ? "bg-accent text-white shadow-[0_0_20px_rgba(255,109,0,0.2)]"
                : "bg-black/[0.04] text-muted hover:bg-black/[0.08] hover:text-foreground"
            )}
          >
            {tab.label}
            <span className={cx(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
              activeTab === tab.id ? "bg-black/20" : "bg-black/[0.06]"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="transition-all duration-500">
        {activeTab === "upcoming" && (
          <div className="grid gap-8 md:grid-cols-2">
            {upcoming.length ? (
              upcoming.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} />
              ))
            ) : (
              <NoMatches message="No fixtures on the calendar right now." />
            )}
          </div>
        )}

        {activeTab === "results" && (
          <div className="space-y-8">
            <ScheduleTable fixtures={completed} />
          </div>
        )}

        {activeTab === "full" && (
          <div className="space-y-8">
            <SeasonRoadmap fixtures={full} />
            <ScheduleTable fixtures={full} />
          </div>
        )}
      </div>
    </div>
  );
}

function NoMatches({ message }: { message: string }) {
  return (
    <div className="glass-panel flex flex-col items-center justify-center p-10 text-center sm:p-16 lg:col-span-2 lg:p-24">
      <div className="h-1 w-12 rounded-full bg-accent/20 mb-6" />
      <p className="text-muted italic">{message}</p>
    </div>
  );
}

function SeasonRoadmap({ fixtures }: { fixtures: Fixture[] }) {
  const completedCount = fixtures.filter(f => f.status === "completed").length;
  const progress = (completedCount / fixtures.length) * 100;

  return (
    <div className="glass-panel p-5 mb-12 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Season So Far</p>
          <p className="mt-1 text-lg font-black text-foreground">Games Played</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-foreground">{Math.round(progress)}%</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{completedCount} of {fixtures.length} games done</p>
        </div>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-black/[0.04]">
        <div 
          className="h-full bg-gradient-to-r from-accent to-orange-400 transition-all duration-1000 shadow-[0_0_15px_rgba(255,109,0,0.3)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
