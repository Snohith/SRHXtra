import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { PointsTableCard } from "@/components/points-table/PointsTableCard";
import type { PointsTableData } from "@/lib/content/points-table";

interface PointsTableTeaserProps {
  table: PointsTableData | null;
}

export function PointsTableTeaser({ table }: PointsTableTeaserProps) {
  return (
    <section className="section-stack">
      <SectionHeader
        eyebrow="Standings"
        title="Points Table"
        description="The latest IPL standings, with Sunrisers Hyderabad's position tracked in real-time."
        action={<Button href="/points-table/" variant="secondary" size="sm">Open table</Button>}
      />
      {table ? (
        <PointsTableCard compact table={table} />
      ) : (
        <div className="panel p-5 text-sm text-muted italic">Standings will appear here after the season launch.</div>
      )}
    </section>
  );
}
