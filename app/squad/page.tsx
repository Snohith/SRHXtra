import { PlayerCard } from "@/components/squad/PlayerCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getSquad } from "@/lib/content/squad";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { formatDisplayDate } from "@/lib/utils/date";

export const metadata = buildPageMetadata({
  title: "SRH IPL 2026 Squad — Full Sunrisers Hyderabad Roster",
  description: "Complete Sunrisers Hyderabad squad for IPL 2026. Player profiles, roles, batting and bowling styles, career statistics, and official roster updates.",
  path: "/squad/",
});

export default function SquadPage() {
  const squad = getSquad();
  const roleOrder = [
    "Batter",
    "Wicketkeeper Batter",
    "All-rounder",
    "Bowler",
  ];
  const remainingRoles = squad.players
    .map((player) => player.role)
    .filter((role, index, roles) => roles.indexOf(role) === index && !roleOrder.includes(role));
  const groupedPlayers = [...roleOrder, ...remainingRoles]
    .map((role) => ({
      role,
      players: squad.players.filter((player) => player.role === role),
    }))
    .filter((group) => group.players.length > 0);

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Season Roster"
        title="Squad"
        description={`The official Sunrisers squad for the ${squad.season} campaign. A collection of world-class talent, emerging stars, and tactical specialists organized for the elite competition.`}
        variant="hero"
        headingLevel={1}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="glass-panel p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Current Season</p>
          <p className="mt-4 text-3xl font-black text-white">{squad.season}</p>
        </div>
        <div className="glass-panel p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Active Roster</p>
          <p className="mt-4 text-3xl font-black text-white">{squad.players.length}</p>
        </div>
        <div className="glass-panel p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Latest Update</p>
          <p className="mt-4 text-3xl font-black text-white">{formatDisplayDate(squad.updatedAt)}</p>
        </div>
      </div>

      <div className="grid gap-20">
        {groupedPlayers.map((group) => (
          <section key={group.role} className="section-stack">
            <SectionHeader
              eyebrow="Role Profile"
              title={group.role}
              description={`Key tactical assets in the ${group.role.toLowerCase()} department.`}
            />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {group.players.map((player) => (
                <PlayerCard key={player.slug} player={player} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
