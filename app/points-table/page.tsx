import { Button } from "@/components/ui/Button";
import { PointsTableCard } from "@/components/points-table/PointsTableCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getPointsTable } from "@/lib/content/points-table";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "IPL 2026 Points Table — SRH Standings Tracker",
  description: "IPL 2026 points table tracking Sunrisers Hyderabad's standings.",
  path: "/points-table/",
});

export default function PointsTablePage() {
  const table = getPointsTable();

  return (
    <div className="page-stack">
      <SectionHeader
        title={`IPL ${table?.season || "2026"} Points Table`}
        variant="hero"
        headingLevel={1}
      />

      {table ? (
        <section className="section-stack">
          <PointsTableCard table={table} />
          <div className="flex flex-wrap gap-3 mt-4">
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
