import { Button } from "@/components/ui/Button";
import { PointsTableCard } from "@/components/points-table/PointsTableCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getPointsTable } from "@/lib/content/points-table";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "IPL 2026 Points Table — SRH Standings Tracker",
  description: "Live IPL 2026 points table tracking Sunrisers Hyderabad's standings, wins, losses, and net run rate across the full league season.",
  path: "/points-table/",
});

export default function PointsTablePage() {
  const table = getPointsTable();

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="IPL Standings"
        title="Points Table"
        description="The live state of play. Tracking every win, loss, and run-rate shift across the campaign path."
        variant="hero"
        headingLevel={1}
      />

      {table ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Tracking"
            title={`Standings • ${table.season}`}
          />
          <PointsTableCard table={table} />
          <div className="flex flex-wrap gap-3">
            <Button href="/schedule/" size="sm" variant="secondary">
              View schedule
            </Button>
            <Button href="/match-coverage/" size="sm" variant="outline">
              Match archive
            </Button>
          </div>
        </section>
      ) : (
        <div className="glass-panel p-20 text-center text-muted italic">
          Standings will be available here as the campaign progresses.
        </div>
      )}
    </div>
  );
}
