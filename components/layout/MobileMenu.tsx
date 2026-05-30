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

  // Prevent background scroll when drawer is open.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

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
          "relative z-[75] flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-lg border transition-all duration-200",
          isOpen
            ? "border-accent/40 bg-accent/10"
            : "border-border bg-black/[0.02] hover:border-border-strong hover:bg-black/[0.04]"
        )}
      >
        <span
          className={cx(
            "h-[1.5px] w-4 rounded-full bg-foreground transition-all duration-300",
            isOpen && "translate-y-[6.5px] rotate-45"
          )}
        />
        <span
          className={cx(
            "h-[1.5px] w-4 rounded-full bg-foreground transition-all duration-300",
            isOpen && "opacity-0"
          )}
        />
        <span
          className={cx(
            "h-[1.5px] w-4 rounded-full bg-foreground transition-all duration-300",
            isOpen && "-translate-y-[6.5px] -rotate-45"
          )}
        />
      </button>

      {/* Full-screen drawer */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-label="Navigation menu"
        className={cx(
          "fixed inset-0 z-[70] transition-all duration-300 ease-out md:hidden",
          isOpen
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        )}
      >
        <button
          type="button"
          aria-label="Close navigation menu"
          className="absolute inset-0 bg-black/30 backdrop-blur-xs"
          onClick={() => setIsOpen(false)}
        />

        <div className="relative flex h-full flex-col bg-background pt-[70px]">
          <div className="border-b border-border bg-surface px-5 py-4">
            <div className="mx-auto flex w-full max-w-xl items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-black text-black">
                S
              </span>
              <span className="text-xs font-black uppercase tracking-[0.22em] text-foreground">
                {siteName}
              </span>
            </div>
          </div>

          <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-5 pb-8 pt-5">
            <ul className="mx-auto grid w-full max-w-xl gap-2">
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setIsOpen(false)}
                      className={cx(
                        "flex items-center justify-between rounded-xl border px-4 py-3.5 text-sm font-extrabold uppercase tracking-[0.14em] transition-all duration-150",
                        active
                          ? "border-accent/45 bg-accent/10 text-foreground"
                          : "border-border bg-black/[0.01] text-muted hover:border-border-strong hover:bg-black/[0.03] hover:text-foreground"
                      )}
                    >
                      {link.label}
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full bg-accent"
                          style={{ boxShadow: "0 0 8px rgba(255, 109, 0, 0.9)" }}
                        />
                      ) : (
                        <span aria-hidden="true" className="text-sm leading-none text-muted/30">
                          -&gt;
                        </span>
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
