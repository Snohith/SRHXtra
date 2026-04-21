import { cx } from "@/lib/utils/classes";
import type { PointsTableData } from "@/lib/content/points-table";

interface PointsTableCardProps {
  table: PointsTableData;
  compact?: boolean;
}

export function PointsTableCard({ table, compact = false }: PointsTableCardProps) {
  const rows = compact ? table.standings.slice(0, 5) : table.standings;

  return (
    <div className="glass-panel overflow-hidden">
      <div className="border-b border-white/5 bg-white/5 px-6 py-6 sm:px-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Standings Feed</p>
        <p className="mt-2 text-xl font-black text-white">IPL {table.season} Edition</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-white/[0.02] text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-left">Pos</th>
              <th className="px-6 py-4 text-left">Team</th>
              <th className="px-6 py-4 text-center">P</th>
              <th className="px-6 py-4 text-center">W</th>
              <th className="px-6 py-4 text-center">L</th>
              <th className="px-6 py-4 text-center">NR</th>
              {!compact ? <th className="px-6 py-4 text-center">T</th> : null}
              <th className="px-6 py-4 text-center">Pts</th>
              <th className="px-6 py-4 text-right">NRR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => {
              const isSrh = row.teamCode === "SRH";

              return (
                <tr 
                  key={row.teamCode} 
                  className={cx(
                    "transition-colors hover:bg-white/[0.02]",
                    isSrh ? "bg-accent/[0.08]" : ""
                  )}
                >
                  <td className="px-6 py-5">
                    <span className={cx(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black",
                      isSrh ? "bg-accent text-black" : "bg-white/5 text-white"
                    )}>
                      {row.position}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <span className={cx(
                        "text-base font-black tracking-tight",
                        isSrh ? "text-accent" : "text-white"
                      )}>
                        {row.teamCode}
                      </span>
                      {!compact ? (
                        <span className="hidden text-sm font-medium text-muted sm:inline-block">
                          {row.team}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-medium text-muted">{row.matches}</td>
                  <td className="px-6 py-5 text-center text-sm font-medium text-white">{row.wins}</td>
                  <td className="px-6 py-5 text-center text-sm font-medium text-white">{row.losses}</td>
                  <td className="px-6 py-5 text-center text-sm font-medium text-muted">{row.noResult}</td>
                  {!compact ? <td className="px-6 py-5 text-center text-sm font-medium text-muted">{row.tied}</td> : null}
                  <td className="px-6 py-5 text-center">
                    <span className="text-base font-black text-white">{row.points}</span>
                  </td>
                  <td className="px-6 py-5 text-right font-mono text-sm font-medium text-muted">
                    {Number(row.netRunRate) > 0 ? "+" : ""}{row.netRunRate}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!compact && (
        <div className="border-t border-white/5 bg-white/5 px-6 py-4 sm:px-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            Official IPL Data • Verified Standings
          </p>
        </div>
      )}
    </div>
  );
}
