import { PlayerProfile } from "@/components/squad/PlayerProfile";
import { PlayerCard } from "@/components/squad/PlayerCard";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { resolvePlayerImage } from "@/lib/content/images";
import { getPlayerBySlug, getPlayerSlugs, getRelatedPlayers } from "@/lib/content/squad";
import { getBreadcrumbJsonLd, getPlayerJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPlayerSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = getPlayerBySlug(slug);

  if (!player) {
    return {};
  }

  const playerImage = resolvePlayerImage(player);

  return buildPageMetadata({
    title: player.name,
    description: player.bio ?? `${player.name} squad profile.`,
    path: `/squad/${player.slug}/`,
    image: playerImage.src,
    type: "profile",
    tags: [player.role, player.nationality],
  });
}

export default async function SquadPlayerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const player = getPlayerBySlug(slug);

  if (!player) {
    throw new Error(`Missing squad profile for slug: ${slug}`);
  }

  const relatedPlayers = getRelatedPlayers(player.slug);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Squad", href: "/squad/" },
    { label: player.name },
  ];
  const jsonLd = [getBreadcrumbJsonLd(breadcrumbItems.map(({ label, href }) => ({ name: label, url: href ?? `/squad/${player.slug}/` }))), getPlayerJsonLd(player)];

  return (
    <div className="page-stack">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />
      <Breadcrumbs items={breadcrumbItems} />
      <PlayerProfile player={player} />
      {relatedPlayers.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="More from the squad"
            title="Continue exploring"
            description="Jump to more player profiles without leaving the squad archive."
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {relatedPlayers.map((entry) => (
              <PlayerCard key={entry.slug} player={entry} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
