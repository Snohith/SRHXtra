"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { isActiveHref, NAV_LINKS } from "@/lib/nav";

/**
 * Mobile menu — the hamburger morphs into a close mark and the panel
 * collapses/expands via an animated `grid-template-rows` (see `.nav-mobile`
 * in globals.css). Collapsed links are `visibility: hidden`, so they stay
 * out of the tab order, and Escape closes the menu.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        className="menu-btn"
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label="Toggle navigation menu"
        onClick={() => setOpen(!open)}
      >
        <span className="menu-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {open ? "Close" : "Menu"}
      </button>
      <nav
        id="mobile-nav"
        className={`nav-mobile${open ? " is-open" : ""}`}
        aria-label="Mobile"
      >
        <div className="nav-mobile-inner">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                isActiveHref(pathname, link.href) ? "page" : undefined
              }
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
