"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActiveHref, NAV_LINKS } from "@/lib/nav";

/**
 * Desktop nav — the current section gets `aria-current="page"` (and with it
 * a persistent underline; hover shows the same line sliding in, see
 * `.nav-desktop a::after` in globals.css).
 */
export default function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="nav-desktop" aria-label="Primary">
      {NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActiveHref(pathname, link.href) ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
