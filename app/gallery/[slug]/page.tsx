import Script from "next/script";

import { Badge } from "@/components/ui/Badge";
import { LightboxViewer } from "@/components/gallery/LightboxViewer";
import { AlbumGrid } from "@/components/gallery/AlbumGrid";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { getGalleryAlbumBySlug, getGalleryAlbumSlugs, getRelatedGalleryAlbums } from "@/lib/content/gallery";
import { resolveGalleryCoverImage } from "@/lib/content/images";
import { getBreadcrumbJsonLd, getGalleryJsonLd } from "@/lib/seo/jsonld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { formatDisplayDate } from "@/lib/utils/date";
import { withBasePath } from "@/lib/utils/paths";

export const dynamicParams = false;

export function generateStaticParams() {
  return getGalleryAlbumSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = getGalleryAlbumBySlug(slug);

  if (!album) {
    return {};
  }

  const coverImage = resolveGalleryCoverImage(album);

  return buildPageMetadata({
    title: album.seoTitle ?? album.title,
    description: album.seoDescription ?? album.description,
    path: album.url,
    image: coverImage.src,
    tags: album.tags,
  });
}

export default async function GalleryAlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = getGalleryAlbumBySlug(slug);

  if (!album) {
    throw new Error(`Missing gallery album for slug: ${slug}`);
  }

  const relatedAlbums = getRelatedGalleryAlbums(album.slug);
  const coverImage = resolveGalleryCoverImage(album);
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Gallery", href: "/gallery/" },
    { label: album.title },
  ];
  const jsonLd = [getBreadcrumbJsonLd(breadcrumbItems.map(({ label, href }) => ({ name: label, url: href ?? album.url }))), getGalleryJsonLd(album)];

  return (
    <div className="page-stack">
      <script
        id={`gallery-jsonld-${album.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="section-stack">
        <Breadcrumbs items={breadcrumbItems} />
        
        <header className="relative mt-8 flex flex-col gap-12">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-4">
                <Badge tone="accent">Visual Story</Badge>
                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                  <span>{formatDisplayDate(album.publishedAt)}</span>
                  <span className="h-1 w-1 rounded-full bg-black/20" />
                  <span>{album.photos.length} Frames</span>
                </div>
              </div>

              <h1 className="editorial-title mt-8 leading-[1.1] tracking-tighter sm:!text-6xl lg:!text-7xl">
                {album.title}
              </h1>
              
              <p className="mt-8 text-xl font-medium leading-relaxed text-muted sm:text-2xl">
                {album.description}
              </p>

              <div className="mt-10 flex flex-wrap gap-2">
                {album.fallbackType === "infographics" ? <Tag label="Match Graphics" /> : null}
                {album.fallbackType === "limited-photos" ? <Tag label="Limited Official Images" /> : null}
                {album.tags.filter(t => t !== "Fallback").map((tag) => (
                  <Tag key={tag} label={tag} />
                ))}
              </div>
            </div>

            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-border bg-surface shadow-premium group">
              <img 
                alt={coverImage.alt} 
                className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                src={withBasePath(coverImage.src)} 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </div>
        </header>
      </div>

      <div className="section-stack">
        <SectionHeader
          title="Full Gallery"
        />
        {album.photos.length > 1 ? (
          <div className="glass-panel p-4 sm:p-8">
            <LightboxViewer photos={album.photos} />
          </div>
        ) : (
          <div className="glass-panel p-20 text-center text-muted italic">
            This album contains a single high-impact visual representation.
          </div>
        )}
      </div>

      {relatedAlbums.length ? (
        <section className="section-stack">
          <SectionHeader
            title="Keep browsing"
          />
          <AlbumGrid albums={relatedAlbums} />
        </section>
      ) : null}
    </div>
  );
}
