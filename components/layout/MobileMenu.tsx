"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SiteLink } from "@/lib/content/site";
import { cx } from "@/lib/utils/classes";

interface MobileMenuProps {
  links: SiteLink[];
  siteName: string;
}

export function MobileMenu({ links, siteName }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Hamburger / Close toggle */}
      <button
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setIsOpen((c) => !c)}
        className={cx(
          "flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-lg border transition-all duration-200",
          isOpen
            ? "border-accent/40 bg-accent/10"
            : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]"
        )}
      >
        <span
          className={cx(
            "h-[1.5px] w-4 rounded-full bg-white transition-all duration-300",
            isOpen && "translate-y-[6.5px] rotate-45"
          )}
        />
        <span
          className={cx(
            "h-[1.5px] w-4 rounded-full bg-white transition-all duration-300",
            isOpen && "opacity-0"
          )}
        />
        <span
          className={cx(
            "h-[1.5px] w-4 rounded-full bg-white transition-all duration-300",
            isOpen && "-translate-y-[6.5px] -rotate-45"
          )}
        />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-down panel */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cx(
          "fixed left-0 right-0 top-[calc(56px+2px)] z-50 transition-all duration-300 ease-out",
          isOpen
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-3 opacity-0 pointer-events-none"
        )}
      >
        <div className="mx-4 overflow-hidden rounded-xl border border-white/[0.09] bg-background/95 shadow-[0_24px_64px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          {/* Panel header */}
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[11px] font-black text-black">
              S
            </span>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">
              {siteName}
            </span>
          </div>

          {/* Nav links */}
          <nav aria-label="Mobile navigation" className="p-3">
            <ul className="grid gap-1">
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setIsOpen(false)}
                      className={cx(
                        "flex items-center justify-between rounded-lg px-4 py-3 text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-150",
                        active
                          ? "bg-accent/10 text-white"
                          : "text-muted hover:bg-white/[0.05] hover:text-white/80"
                      )}
                    >
                      {link.label}
                      {active && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-accent"
                          style={{ boxShadow: "0 0 6px rgba(255, 130, 0, 0.8)" }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
