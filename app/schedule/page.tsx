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
        description={`The official campaign roadmap for ${schedule.season}. Every fixture, every venue, and every tactical battle tracked with clinical precision for the SRH faithful.`}
        variant="hero"
        headingLevel={1}
      />

      <section className="section-stack">
        <SectionHeader
          eyebrow="The Road Ahead"
          title="Upcoming Fixtures"
          description="High-stakes encounters scheduled for the coming weeks."
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
          eyebrow="Match Records"
          title="Season Results"
          description="Analysis and summaries from completed campaign phases."
        />
        <ScheduleTable fixtures={completedFixtures.length ? completedFixtures : schedule.fixtures} />
      </section>
    </div>
  );
}
