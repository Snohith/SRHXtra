import Link from "next/link";

import type { GalleryAlbum } from "@/lib/content/gallery";
import { resolveGalleryCoverImage } from "@/lib/content/images";
import { formatDisplayDate } from "@/lib/utils/date";
import { Tag } from "@/components/ui/Tag";
import { SafeImage } from "@/components/ui/SafeImage";

interface AlbumGridProps {
  albums: GalleryAlbum[];
}

export function AlbumGrid({ albums }: AlbumGridProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 sm:gap-8 xl:grid-cols-3">
      {albums.map((album) => {
        const coverImage = resolveGalleryCoverImage(album);

        return (
          <article key={album.slug} className="glass-panel group overflow-hidden transition-all duration-500 hover:border-accent/30">
            <Link href={album.url} className="block">
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-strong">
                <SafeImage
                  alt={coverImage.alt}
                  className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  src={coverImage.src}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100" />
                <div className="absolute bottom-6 left-6 right-6 translate-y-4 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 max-sm:translate-y-0 max-sm:opacity-100">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">View Full Gallery</span>
                </div>
              </div>
              <div className="p-5 sm:p-8">
                <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted sm:gap-3 sm:tracking-[0.2em]">
                  <span>{formatDisplayDate(album.publishedAt)}</span>
                  <span className="h-1 w-1 rounded-full bg-border-strong" />
                  <span>{album.photos.length} Frames</span>
                </div>
                <h3 className="mt-4 text-xl font-black uppercase tracking-tight text-foreground transition group-hover:text-accent sm:text-2xl">
                  {album.title}
                </h3>
                <p className="mt-4 line-clamp-2 text-sm font-medium leading-relaxed text-muted">{album.description}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {album.fallbackType === "infographics" ? <Tag label="Match Graphics" /> : null}
                  {album.fallbackType === "limited-photos" ? <Tag label="Limited Official Images" /> : null}
                  {album.tags.filter(t => t !== "Fallback").map((tag) => (
                    <Tag key={tag} label={tag} />
                  ))}
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
