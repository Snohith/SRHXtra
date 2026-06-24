import Link from "next/link";
import Image from "next/image";
import { PlayerCard } from "@/components/squad/PlayerCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getSquad } from "@/lib/content/squad";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { Badge } from "@/components/ui/Badge";

export const metadata = buildPageMetadata({
  title: "SRH IPL 2026 Squad — Full Sunrisers Hyderabad Roster",
  description: "Complete Sunrisers Hyderabad squad for IPL 2026.",
  path: "/squad/",
});

const RETAINED_SLUGS = [
  "abhishek-sharma",
  "heinrich-klaasen",
  "travis-head",
  "nitish-kumar-reddy",
  "pat-cummins",
  "jaydev-unadkat",
  "eshan-malinga",
  "zeeshan-ansari",
  "kamindu-mendis",
  "harsh-dubey",
  "smaran-ravichandran"
];

export default function SquadPage() {
  const squad = getSquad();
  const captainPlayer = squad.players.find((p) => p.slug === "pat-cummins");
  
  // Filter out captain from grids to avoid duplication in grids
  const gridPlayers = squad.players.filter((p) => p.slug !== "pat-cummins");
  
  const retainedPlayers = gridPlayers.filter((p) => RETAINED_SLUGS.includes(p.slug));
  const auctionBuys = gridPlayers.filter((p) => !RETAINED_SLUGS.includes(p.slug));

  return (
    <div className="page-stack">
      <SectionHeader
        title="Squad"
        variant="hero"
        headingLevel={1}
      />

      {/* Main Hierarchy Container */}
      <div className="flex flex-col items-center justify-center p-4 sm:p-10 bg-[#fafbfc] rounded-3xl border border-neutral-200/60 shadow-xs">
        
        {/* Level 1: Owner */}
        <div className="flex flex-col items-center">
          <div className="w-64 glass-panel p-5 border border-accent/20 flex flex-col items-center text-center shadow-md">
            <Badge tone="accent" className="bg-[#ff6d00] text-white border-none font-black text-[9px] mb-3">Owner</Badge>
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#ff6d00] to-[#ffa726] flex items-center justify-center text-white font-black text-xl shadow-inner mb-3">
              KM
            </div>
            <h3 className="text-lg font-black uppercase text-foreground">Kavya Maran</h3>
            <p className="text-xs text-neutral-500 font-semibold tracking-wider mt-1">Sunrisers Hyderabad</p>
          </div>
        </div>

        {/* Connector Line 1 */}
        <div className="h-10 w-0.5 bg-[#ff6d00]/30" />

        {/* Level 2: Management */}
        <div className="flex flex-col items-center">
          <div className="w-64 glass-panel p-5 border border-neutral-300 flex flex-col items-center text-center shadow-md">
            <Badge tone="neutral" className="bg-neutral-800 text-white border-none font-black text-[9px] mb-3">Management</Badge>
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-500 flex items-center justify-center text-white font-black text-xl shadow-inner mb-3">
              DV
            </div>
            <h3 className="text-lg font-black uppercase text-foreground">Daniel Vettori</h3>
            <p className="text-xs text-neutral-500 font-semibold tracking-wider mt-1">Head Coach</p>
          </div>
        </div>

        {/* Connector Line 2 */}
        <div className="h-10 w-0.5 bg-[#ff6d00]/30" />

        {/* Level 3: Captain */}
        <div className="flex flex-col items-center">
          <div className="w-64 glass-panel p-5 border border-accent/20 flex flex-col items-center text-center shadow-md relative group hover:border-accent transition-all duration-300">
            {captainPlayer ? (
              <Link href={`/squad/${captainPlayer.slug}/`} className="flex flex-col items-center w-full">
                <Badge tone="accent" className="bg-[#ff6d00] text-white border-none font-black text-[9px] mb-3">Captain</Badge>
                <div className="h-16 w-16 rounded-full overflow-hidden border border-accent/30 bg-surface-strong shadow-inner mb-3">
                  <Image
                    src={captainPlayer.image}
                    alt={captainPlayer.imageAlt}
                    width={64}
                    height={64}
                    className="object-cover h-full w-full"
                  />
                </div>
                <h3 className="text-lg font-black uppercase text-foreground group-hover:text-accent transition-colors">{captainPlayer.name}</h3>
                <p className="text-xs text-neutral-500 font-semibold tracking-wider mt-1">{captainPlayer.role}</p>
              </Link>
            ) : (
              <>
                <Badge tone="accent" className="bg-[#ff6d00] text-white border-none font-black text-[9px] mb-3">Captain</Badge>
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-[#ff6d00] to-[#ffa726] flex items-center justify-center text-white font-black text-xl shadow-inner mb-3">
                  PC
                </div>
                <h3 className="text-lg font-black uppercase text-foreground">Pat Cummins</h3>
                <p className="text-xs text-neutral-500 font-semibold tracking-wider mt-1">Bowler</p>
              </>
            )}
          </div>
        </div>

        {/* Connector Line 3 */}
        <div className="h-10 w-0.5 bg-[#ff6d00]/30" />
        
        {/* Branches */}
        <div className="relative w-full border-t border-[#ff6d00]/30 pt-8 mt-0">
          <div className="grid gap-12 lg:grid-cols-2">
            
            {/* Left Branch: Retained Players */}
            <div className="flex flex-col items-center">
              <div className="mb-6 flex flex-col items-center">
                <span className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#ff6d00]">Core Roster</span>
                <h3 className="text-xl font-black uppercase text-foreground border-b-2 border-[#ff6d00] pb-1 px-4">
                  Retained Players
                </h3>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 w-full">
                {retainedPlayers.map((player) => (
                  <PlayerCard key={player.slug} player={player} />
                ))}
              </div>
            </div>

            {/* Right Branch: Auction Buys */}
            <div className="flex flex-col items-center border-t lg:border-t-0 lg:border-l border-neutral-200/80 pt-12 lg:pt-0 lg:pl-12">
              <div className="mb-6 flex flex-col items-center">
                <span className="mb-2 text-[10px] font-black uppercase tracking-widest text-neutral-400">New Signings</span>
                <h3 className="text-xl font-black uppercase text-foreground border-b-2 border-neutral-800 pb-1 px-4">
                  Auction Buys
                </h3>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 w-full">
                {auctionBuys.map((player) => (
                  <PlayerCard key={player.slug} player={player} />
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
