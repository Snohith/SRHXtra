"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FRANCHISES, getEquivalentPath, getPathFranchise } from "@/lib/content/franchises";
import { cx } from "@/lib/utils/classes";

/**
 * Design-preview franchise switcher.
 *
 * Pathname-aware: each pill resolves to the equivalent page in its
 * franchise (section indexes swap, detail pages fall back gracefully).
 * Only Hyderabad has live routes — the rest render as "Soon" until
 * their franchises ship, at which point no component change is needed.
 */
export function FranchiseStrip() {
  const pathname = usePathname();
  const current = getPathFranchise(pathname);

  return (
    <nav
      aria-label="Franchise switcher"
      className="border-t border-white/10 bg-gradient-to-r from-[#0d0d0d] via-[#161006] to-[#0d0d0d]"
    >
      <div className="shell-wide flex items-center justify-start gap-1 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center sm:gap-2 [&::-webkit-scrollbar]:hidden">
        {FRANCHISES.map((franchise) => {
          const isCurrent = franchise.slug === current;
          const href = isCurrent ? pathname : getEquivalentPath(pathname, franchise.slug);
          const inner = (
            <>
              <span
                className={cx(
                  "flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all",
                  isCurrent
                    ? "bg-white shadow-[0_0_12px_rgba(255,109,0,0.55)]"
                    : "bg-white/[0.08]",
                )}
              >
                <img
                  src={franchise.crest}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </span>
              <span>{franchise.label}</span>
              {!franchise.enabled ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] tracking-[0.18em] text-neutral-500">
                  Soon
                </span>
              ) : null}
            </>
          );

          const className = cx(
            "relative flex shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all",
            isCurrent
              ? "bg-[#ff6d00]/15 text-white shadow-[inset_0_0_0_1px_rgba(255,109,0,0.45)]"
              : franchise.enabled
                ? "text-neutral-400 hover:bg-white/5 hover:text-white"
                : "cursor-not-allowed text-neutral-600",
          );

          return franchise.enabled ? (
            <Link
              key={franchise.slug}
              href={href}
              aria-current={isCurrent ? "page" : undefined}
              className={className}
            >
              {inner}
            </Link>
          ) : (
            <span key={franchise.slug} aria-disabled="true" className={className}>
              {inner}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
