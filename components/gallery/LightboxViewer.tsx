"use client";

import { useEffect, useState } from "react";

import type { GalleryPhoto } from "@/lib/content/gallery";
import { Button } from "@/components/ui/Button";

interface LightboxViewerProps {
  photos: GalleryPhoto[];
}

function resolvePhotoSource(photo: GalleryPhoto) {
  return photo.src || photo.sourceUrl || "/images/site/hero-placeholder.svg";
}

function resolvePhotoAlt(photo: GalleryPhoto) {
  return photo.alt || "Gallery image";
}

export function LightboxViewer({ photos }: LightboxViewerProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activePhoto = activeIndex !== null ? photos[activeIndex] : null;

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current === null ? 0 : (current + 1) % photos.length));
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null ? 0 : (current - 1 + photos.length) % photos.length,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, photos.length]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {photos.map((photo, index) => (
          <button
            key={photo.src}
            className="panel overflow-hidden text-left transition hover:-translate-y-0.5 hover:border-accent/40"
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <div className="image-frame rounded-none border-0 border-b bg-surface-strong p-2">
              <img
                alt={resolvePhotoAlt(photo)}
                className="mx-auto block max-h-[320px] w-full object-contain"
                loading="lazy"
                src={resolvePhotoSource(photo)}
              />
            </div>
            <div className="p-4">
              <p className="font-medium text-foreground">{resolvePhotoAlt(photo)}</p>
              {photo.caption ? <p className="mt-2 text-sm text-muted">{photo.caption}</p> : null}
            </div>
          </button>
        ))}
      </div>

      {activePhoto ? (
        <div aria-modal="true" className="fixed inset-0 z-50 bg-black/85 px-4 py-6 backdrop-blur" role="dialog">
          <div className="mx-auto flex h-full max-w-5xl flex-col justify-center gap-4">
            <div className="flex justify-between gap-3">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setActiveIndex((current) =>
                      current === null ? 0 : (current - 1 + photos.length) % photos.length,
                    )
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setActiveIndex((current) =>
                      current === null ? 0 : (current + 1) % photos.length,
                    )
                  }
                >
                  Next
                </Button>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setActiveIndex(null)}>
                Close
              </Button>
            </div>
            <div className="image-frame mx-auto max-h-[75vh] overflow-hidden">
              {activePhoto ? (
                <img
                  alt={resolvePhotoAlt(activePhoto)}
                  className="h-auto max-h-[75vh] w-auto object-contain"
                  loading="lazy"
                  src={resolvePhotoSource(activePhoto)}
                />
              ) : null}
            </div>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-lg font-medium text-white">{resolvePhotoAlt(activePhoto)}</p>
              {activePhoto.caption ? <p className="mt-2 text-sm text-muted">{activePhoto.caption}</p> : null}
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
                {(activeIndex ?? 0) + 1} of {photos.length}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
