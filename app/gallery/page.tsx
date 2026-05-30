import { AlbumGrid } from "@/components/gallery/AlbumGrid";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getAllGalleryAlbums } from "@/lib/content/gallery";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "SRH Photo Gallery — Match Night Photography & Visual Stories",
  description: "Official Sunrisers Hyderabad photo galleries from IPL 2026 match nights.",
  path: "/gallery/",
});

export default function GalleryIndexPage() {
  const albums = getAllGalleryAlbums();
  const featuredAlbum = albums[0] ?? null;
  const remainingAlbums = albums.slice(1);

  return (
    <div className="page-stack">
      <SectionHeader
        title="The Gallery"
        variant="hero"
        headingLevel={1}
      />
      
      {featuredAlbum ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Highlights"
            title="Latest Album"
          />
          <AlbumGrid albums={[featuredAlbum]} />
        </section>
      ) : null}

      {remainingAlbums.length ? (
        <section className="section-stack">
          <SectionHeader
            eyebrow="Collection"
            title="Past Rounds"
          />
          <AlbumGrid albums={remainingAlbums} />
        </section>
      ) : null}
    </div>
  );
}
