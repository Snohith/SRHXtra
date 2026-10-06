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
        title="Points Table"
        action={<Button href="/sunrisers-hyderabad/points-table/" variant="secondary" size="sm">Open table</Button>}
      />
      {table ? (
        <PointsTableCard compact table={table} />
      ) : (
        <div className="panel p-5 text-sm text-muted italic">The table goes up here once the season starts.</div>
      )}
    </section>
  );
}
