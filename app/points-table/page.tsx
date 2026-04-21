import { PointsTableCard } from "@/components/points-table/PointsTableCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getPointsTable } from "@/lib/content/points-table";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Points Table",
  path: "/points-table/",
});

export default function PointsTablePage() {
  const table = getPointsTable();

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="IPL Standings"
        title="Points Table"
        description="The official state of play. Our standings feed tracks every win, loss, and run-rate shift with clinical precision, ensuring you stay informed on the SRH campaign path."
        variant="hero"
      />

      {table ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Season Feed"
            title={`Standings • ${table.season}`}
          />
          <PointsTableCard table={table} />
        </section>
      ) : (
        <div className="glass-panel p-20 text-center text-muted italic">
          Standings data is currently being updated for the latest campaign.
        </div>
      )}
    </div>
  );
}
