import { NextMatchHero } from "@/components/schedule/NextMatchHero";
import { ScheduleTabs } from "@/components/schedule/ScheduleTabs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getFixturesByStatus, getSchedule } from "@/lib/content/schedule";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH IPL 2026 Schedule — Fixtures, Results & Match Dates",
  description: "Full Sunrisers Hyderabad fixture list for IPL 2026. Upcoming match dates, venues, kick-off times, and completed match results in one place.",
  path: "/schedule/",
});

export default function SchedulePage() {
  const schedule = getSchedule();
  const upcomingFixtures = getFixturesByStatus("upcoming");
  const completedFixtures = getFixturesByStatus("completed");
  const nextMatch = upcomingFixtures[0] || completedFixtures[completedFixtures.length - 1];

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Season Tracker"
        title="Official Schedule"
        description={`The complete IPL ${schedule.season} campaign roadmap. Tracking venues, match timings, and results across every phase.`}
        variant="hero"
        headingLevel={1}
      />

      <div className="section-stack">
        {nextMatch && <NextMatchHero fixture={nextMatch} />}
      </div>

      <section className="section-stack">
        <SectionHeader
          eyebrow="Match Feed"
          title="Season Roadmap"
          description="Filter through upcoming battles and archived results."
        />
        
        <ScheduleTabs 
          upcoming={upcomingFixtures} 
          completed={completedFixtures} 
          full={schedule.fixtures} 
        />
      </section>
    </div>
  );
}
