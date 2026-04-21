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
        description="The latest official IPL table, with SRH highlighted inside the current standings."
        action={<Button href="/points-table/" variant="secondary" size="sm">Open table</Button>}
      />
      {table ? (
        <PointsTableCard compact table={table} />
      ) : (
        <div className="panel p-5 text-sm text-muted">The official points table will appear here after the next sync.</div>
      )}
    </section>
  );
}
