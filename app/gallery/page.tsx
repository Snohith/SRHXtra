import { AlbumGrid } from "@/components/gallery/AlbumGrid";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getAllGalleryAlbums } from "@/lib/content/gallery";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH Photo Gallery — Match Night Photography & Visual Stories",
  description: "Official Sunrisers Hyderabad photo galleries from IPL 2026 match nights. High-definition match photography, fan culture, and exclusive visual coverage.",
  path: "/gallery/",
});

export default function GalleryIndexPage() {
  const albums = getAllGalleryAlbums();
  const featuredAlbum = albums[0] ?? null;
  const remainingAlbums = albums.slice(1);

  return (
    <div className="page-stack">
      <SectionHeader
        eyebrow="Visual Stories"
        title="The Gallery"
        description="Immersive visual storytelling from the heart of the SRH campaign. High-definition match-night captures, fan culture, and exclusive behind-the-scenes perspectives."
        variant="hero"
        headingLevel={1}
      />
      
      {featuredAlbum ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Latest Capture"
            title="Featured Visual"
          />
          <AlbumGrid albums={[featuredAlbum]} />
        </section>
      ) : null}

      {remainingAlbums.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Visual Vault"
            title="Archive Memories"
          />
          <AlbumGrid albums={remainingAlbums} />
        </section>
      ) : null}
    </div>
  );
}
