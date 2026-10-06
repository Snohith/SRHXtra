"use client";

import { useState } from "react";

import { withBasePath } from "@/lib/utils/paths";

const FALLBACK_SRC = "/images/site/hero-placeholder.svg";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  width?: number;
  height?: number;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Image with graceful degradation for dead upstream URLs.
 *
 * A large share of gallery imagery is hotlinked from league CDNs that can
 * revoke access at any time; without this, those albums render broken-image
 * icons. Falls back exactly once to a local placeholder.
 */
export function SafeImage({
  src,
  alt,
  className,
  loading = "lazy",
  width,
  height,
  "aria-hidden": ariaHidden,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const currentSrc = withBasePath(failed ? FALLBACK_SRC : src);

  return (
    <img
      src={currentSrc}
      alt={failed ? "Placeholder image" : alt}
      className={className}
      loading={loading}
      width={width}
      height={height}
      aria-hidden={ariaHidden}
      onError={() => {
        if (!failed) {
          setFailed(true);
        }
      }}
    />
  );
}
