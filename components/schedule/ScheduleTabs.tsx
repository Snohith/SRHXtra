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
  const [activeTab, setActiveTab] = useState<"upcoming" | "results" | "full">("upcoming");

  const tabs = [
    { id: "upcoming", label: "Upcoming Matches", count: upcoming.length },
    { id: "results", label: "Match Results", count: completed.length },
    { id: "full", label: "Full Roadmap", count: full.length },
  ] as const;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cx(
              "relative flex items-center gap-3 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === tab.id
                ? "bg-accent text-black shadow-[0_0_20px_rgba(255,130,0,0.3)]"
                : "bg-white/5 text-muted hover:bg-white/10 hover:text-white"
            )}
          >
            {tab.label}
            <span className={cx(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
              activeTab === tab.id ? "bg-black/20" : "bg-white/10"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="transition-all duration-500">
        {activeTab === "upcoming" && (
          <div className="grid gap-8 lg:grid-cols-2">
            {upcoming.length ? (
              upcoming.map((fixture) => (
                <FixtureCard key={fixture.id} fixture={fixture} />
              ))
            ) : (
              <NoMatches message="No upcoming matches found." />
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
    <div className="glass-panel lg:col-span-2 flex flex-col items-center justify-center p-24 text-center">
      <div className="h-1 w-12 rounded-full bg-accent/20 mb-6" />
      <p className="text-muted italic">{message}</p>
    </div>
  );
}

function SeasonRoadmap({ fixtures }: { fixtures: Fixture[] }) {
  const completedCount = fixtures.filter(f => f.status === "completed").length;
  const progress = (completedCount / fixtures.length) * 100;

  return (
    <div className="glass-panel p-8 mb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Season Progress</p>
          <p className="mt-1 text-lg font-black text-white">Campaign Roadmap</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-white">{Math.round(progress)}%</span>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{completedCount} / {fixtures.length} Games Played</p>
        </div>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/5">
        <div 
          className="h-full bg-gradient-to-r from-accent to-orange-400 transition-all duration-1000 shadow-[0_0_15px_rgba(255,130,0,0.4)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
