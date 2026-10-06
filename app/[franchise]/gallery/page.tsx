import { AlbumGrid } from "@/components/gallery/AlbumGrid";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getAllGalleryAlbums } from "@/lib/content/gallery";
import { getItemListJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";

import { assertLiveFranchise, generateFranchiseStaticParams } from "@/lib/content/franchise-route";

export const metadata = buildPageMetadata({
  title: "SRH Photo Gallery — Match Night Photos",
  description: "Photos from Sunrisers Hyderabad games in IPL 2026, grouped by match.",
  path: "/sunrisers-hyderabad/gallery/",
});


export const dynamicParams = false;

export function generateStaticParams() {
  return generateFranchiseStaticParams();
}

export default async function GalleryIndexPage({ params }: { params: Promise<{ franchise: string }> }) {
  await assertLiveFranchise(params);
  const albums = getAllGalleryAlbums();
  const featuredAlbum = albums[0] ?? null;
  const remainingAlbums = albums.slice(1);
  const itemListJsonLd = getItemListJsonLd(
    albums.slice(0, 25).map((album) => ({
      name: album.title,
      url: album.url,
      image: album.coverImage,
      datePublished: album.publishedAt,
    })),
    "/sunrisers-hyderabad/gallery/",
  );

  return (
    <div className="page-stack">
      <h1 className="sr-only">Sunrisers Hyderabad photo galleries from match nights</h1>
      <script
        id="gallery-itemlist-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
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
            title="Older Albums"
          />
          <AlbumGrid albums={remainingAlbums} />
        </section>
      ) : null}
    </div>
  );
}
