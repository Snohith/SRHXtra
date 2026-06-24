"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { SiteLink } from "@/lib/content/site";
import { cx } from "@/lib/utils/classes";

interface NavLinksProps {
  links: SiteLink[];
}

export function NavLinks({ links }: NavLinksProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="hidden items-center gap-0 md:flex" aria-label="Main navigation">
      {links.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase tracking-[0.13em] transition-all duration-200",
              active
                ? "text-white"
                : "text-neutral-400 hover:text-white"
            )}
          >
            {link.label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute bottom-0.5 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-accent"
                style={{ boxShadow: "0 0 8px rgba(255, 109, 0, 0.65)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
