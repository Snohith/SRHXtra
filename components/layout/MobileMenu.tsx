"use client";

import { useState } from "react";
import Link from "next/link";

import type { SiteLink } from "@/lib/content/site";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/utils/classes";

interface MobileMenuProps {
  links: SiteLink[];
}

export function MobileMenu({ links }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        aria-expanded={isOpen}
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen((current) => !current)}
        className="min-w-24"
      >
        {isOpen ? "Close" : "Menu"}
      </Button>
      <div
        className={cx(
          "overflow-hidden transition-[max-height,opacity] duration-200",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="mt-4 panel-strong p-4">
          <ul className="grid gap-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block rounded-2xl px-3 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/5 hover:text-accent"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
