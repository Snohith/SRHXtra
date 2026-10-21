import type { ReactNode } from "react";

/**
 * Per-navigation wrapper. App Router re-mounts `template.tsx` on every route
 * change, which re-triggers the CSS page transition (see `.page-transition`
 * in globals.css): a short fade + rise that makes client-side navigation
 * feel like a page turn. `prefers-reduced-motion` turns it off entirely.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
