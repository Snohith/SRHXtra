import { FixtureCard } from "@/components/schedule/FixtureCard";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
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

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Season Tracker"
        title="Schedule"
        description={`The complete IPL ${schedule.season} campaign roadmap. Tracking venues, match timings, and results across every phase.`}
        variant="hero"
        headingLevel={1}
      />

      <section className="section-stack">
        <SectionHeader
          eyebrow="Next Up"
          title="Fixture List"
          description="Matches on the horizon for the Sunrisers squad."
        />
        <div className="grid gap-8 lg:grid-cols-2">
          {upcomingFixtures.length ? (
            upcomingFixtures.map((fixture) => (
              <FixtureCard key={fixture.id} fixture={fixture} />
            ))
          ) : (
            <div className="glass-panel lg:col-span-2 p-12 text-center text-muted italic">
              No upcoming fixtures are currently scheduled.
            </div>
          )}
        </div>
      </section>

      <section className="section-stack">
        <SectionHeader
          eyebrow="Log"
          title="Season Results"
          description="Full results and linked reports from completed matches."
        />
        <ScheduleTable fixtures={completedFixtures.length ? completedFixtures : schedule.fixtures} />
      </section>
    </div>
  );
}
