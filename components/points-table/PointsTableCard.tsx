import Image from "next/image";
import { cx } from "@/lib/utils/classes";
import type { PointsTableData } from "@/lib/content/points-table";

interface PointsTableCardProps {
  table: PointsTableData;
  compact?: boolean;
}

const TOTAL_LEAGUE_GAMES = 14;

export function PointsTableCard({ table, compact = false }: PointsTableCardProps) {
  const rows = compact ? table.standings.slice(0, 5) : table.standings;

  return (
    <div className="glass-panel overflow-hidden border border-border shadow-xs bg-white">
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="min-w-[660px] border-separate border-spacing-0 sm:min-w-full">
          <thead className="sticky top-0 z-40 bg-surface/95 text-[10px] font-bold uppercase tracking-[0.2em] text-muted backdrop-blur-md">
            <tr className="border-b border-border">
              <th className="sticky left-0 top-0 z-50 bg-surface px-3 py-4 text-left shadow-[2px_0_10px_rgba(0,0,0,0.03)] sm:px-6 sm:shadow-none">Pos</th>
              <th className="sticky left-12 top-0 z-50 bg-surface px-3 py-4 text-left shadow-[2px_0_10px_rgba(0,0,0,0.03)] sm:left-16 sm:px-6 sm:shadow-none">Team</th>
              <th className="sticky top-0 px-6 py-4 text-center">P</th>
              {!compact && <th className="sticky top-0 px-6 py-4 text-center text-muted/40">Rem</th>}
              <th className="sticky top-0 px-6 py-4 text-center">W</th>
              <th className="sticky top-0 px-6 py-4 text-center">L</th>
              <th className="sticky top-0 px-6 py-4 text-center">NR</th>
              {!compact ? (
                <>
                  <th className="sticky top-0 px-6 py-4 text-center">Pts</th>
                  <th className="sticky top-0 px-6 py-4 text-center">Form</th>
                  <th className="sticky top-0 px-6 py-4 text-right">NRR</th>
                </>
              ) : (
                <>
                  <th className="sticky top-0 px-6 py-4 text-center">Pts</th>
                  <th className="sticky top-0 px-6 py-4 text-right">NRR</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, index) => {
              const isSrh = row.teamCode === "SRH";
              const isPlayoffZone = row.position <= 4;
              const isLastPlayoffRow = row.position === 4;
              const nrrValue = Number(row.netRunRate);
              const remainingGames = TOTAL_LEAGUE_GAMES - row.matches;
              
              // Max NRR for bar visualization (clamped at 2.0)
              const nrrPercentage = Math.min(Math.abs(nrrValue) / 2.0, 1) * 100;

              return (
                <tr 
                  key={row.teamCode} 
                  className={cx(
                    "group relative transition-colors hover:bg-black/[0.02]",
                    isSrh ? "bg-accent/[0.08]" : (isPlayoffZone ? "bg-accent/[0.02]" : ""),
                    isLastPlayoffRow && "border-b-2 border-accent/20"
                  )}
                >
                  <td className={cx(
                    "sticky left-0 z-10 px-3 py-4 shadow-[2px_0_10px_rgba(0,0,0,0.03)] sm:px-6 sm:py-5 sm:shadow-none",
                    isSrh ? "bg-surface-strong" : (isPlayoffZone ? "bg-surface/60" : "bg-surface")
                  )}>
                    {isPlayoffZone && (
                      <div className="absolute inset-y-0 left-0 w-1 bg-accent shadow-[0_0_10px_rgba(255,109,0,0.3)]" />
                    )}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className={cx(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-transform group-hover:scale-110 sm:h-8 sm:w-8 sm:text-sm",
                          isSrh ? "bg-accent text-white" : (isPlayoffZone ? "bg-accent/20 text-accent" : "bg-black/[0.04] text-foreground")
                        )}>
                          {row.position}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className={cx(
                    "sticky left-12 z-10 px-3 py-4 shadow-[2px_0_10px_rgba(0,0,0,0.03)] sm:left-16 sm:px-6 sm:py-5 sm:shadow-none",
                    isSrh ? "bg-surface-strong" : (isPlayoffZone ? "bg-surface/60" : "bg-surface")
                  )}>
                    <div className="flex items-center gap-3">
                      {row.sourceTeamLogo ? (
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-black/[0.02] p-1 ring-1 ring-black/[0.04]">
                          <Image
                            src={row.sourceTeamLogo}
                            alt={`${row.teamCode} logo`}
                            fill
                            className="object-contain"
                            sizes="32px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-8 shrink-0 rounded-full bg-black/[0.02]" />
                      )}
                      <div className="flex flex-col">
                        <span className={cx(
                          "text-base font-black tracking-tight",
                          isSrh ? "text-accent" : "text-foreground"
                        )}>
                          {row.teamCode}
                        </span>
                        {!compact ? (
                          <span className="hidden text-[10px] font-bold uppercase tracking-wider text-muted/60 sm:inline-block">
                            {row.team}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center text-sm font-medium text-foreground">{row.matches}</td>
                  {!compact && (
                    <td className="px-6 py-5 text-center text-[10px] font-black text-muted/30">
                      {remainingGames}
                    </td>
                  )}
                  <td className="px-6 py-5 text-center text-sm font-medium text-foreground">{row.wins}</td>
                  <td className="px-6 py-5 text-center text-sm font-medium text-foreground">{row.losses}</td>
                  <td className="px-6 py-5 text-center text-sm font-medium text-muted">{row.noResult}</td>
                  
                  <td className="px-6 py-5 text-center">
                    <span className="text-base font-black text-foreground">{row.points}</span>
                  </td>

                  {!compact && (
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center gap-1.5">
                        {row.recentForm.slice(-5).map((result, i) => (
                          <div
                            key={i}
                            title={result === "W" ? "Won" : result === "L" ? "Lost" : "No Result"}
                            className={cx(
                              "h-2 w-2 rounded-full",
                              result === "W" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]" :
                              result === "L" ? "bg-rose-500" : 
                              "bg-slate-500"
                            )}
                          />
                        ))}
                      </div>
                    </td>
                  )}

                  <td className="px-6 py-5">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={cx(
                        "font-mono text-sm font-bold",
                        nrrValue > 0 ? "text-emerald-600" : nrrValue < 0 ? "text-rose-600" : "text-muted"
                      )}>
                        {nrrValue > 0 ? "+" : ""}{row.netRunRate}
                      </span>
                      {!compact && (
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-black/[0.06]">
                          <div 
                            className={cx(
                              "h-full rounded-full transition-all duration-1000",
                              nrrValue > 0 ? "bg-emerald-500" : "bg-rose-500"
                            )}
                            style={{ width: `${nrrPercentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!compact && (
        <div className="border-t border-border bg-black/[0.01] px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-y-4 gap-x-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
              Official IPL Data • Verified Standings
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-1 w-6 rounded-full bg-black/[0.08] overflow-hidden">
                  <div className="h-full w-2/3 bg-emerald-500" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted/60">NRR Strength</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
