import { Button } from "@/components/ui/Button";
import { PointsTableCard } from "@/components/points-table/PointsTableCard";
import { getPointsTable } from "@/lib/content/points-table";
import { buildPageMetadata } from "@/lib/seo/metadata";

import { assertLiveFranchise, generateFranchiseStaticParams } from "@/lib/content/franchise-route";

export const metadata = buildPageMetadata({
  title: "IPL 2026 Points Table — Where SRH Stand",
  description: "The IPL 2026 table, with Sunrisers Hyderabad's position, points and net run rate.",
  path: "/sunrisers-hyderabad/points-table/",
});


export const dynamicParams = false;

export function generateStaticParams() {
  return generateFranchiseStaticParams();
}

export default async function PointsTablePage({ params }: { params: Promise<{ franchise: string }> }) {
  await assertLiveFranchise(params);
  const table = getPointsTable();

  return (
    <div className="page-stack">
      <h1 className="sr-only">IPL points table and Sunrisers Hyderabad standings</h1>
      {table ? (
        <section className="section-stack">
          <PointsTableCard table={table} />
          <div className="flex flex-wrap gap-3 mt-4">
            <Button href="/sunrisers-hyderabad/schedule/" size="sm" variant="secondary">
              View schedule
            </Button>
            <Button href="/sunrisers-hyderabad/match-coverage/" size="sm" variant="outline">
              Match archive
            </Button>
          </div>
        </section>
      ) : (
        <div className="glass-panel p-20 text-center text-muted italic">
          The table will appear here once the season starts.
        </div>
      )}
    </div>
  );
}
