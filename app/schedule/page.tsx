import { NextMatchHero } from "@/components/schedule/NextMatchHero";
import { ScheduleTabs } from "@/components/schedule/ScheduleTabs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getFixturesByStatus, getNextFixture, getSchedule } from "@/lib/content/schedule";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH IPL 2026 Schedule — Fixtures, Results & Match Dates",
  description: "Full Sunrisers Hyderabad fixture list for IPL 2026.",
  path: "/schedule/",
});

export default function SchedulePage() {
  const schedule = getSchedule();
  const upcomingFixtures = getFixturesByStatus("upcoming");
  const completedFixtures = getFixturesByStatus("completed");
  const nextMatch = getNextFixture() || completedFixtures[completedFixtures.length - 1];

  return (
    <div className="page-stack">
      <SectionHeader
        title="Official Schedule"
        variant="hero"
        headingLevel={1}
      />

      <div className="section-stack">
        {nextMatch && <NextMatchHero fixture={nextMatch} />}
      </div>

      <section className="section-stack">
        <SectionHeader
          title="Season Roadmap"
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
