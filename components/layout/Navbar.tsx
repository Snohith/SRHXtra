import Link from "next/link";

import type { SiteConfig } from "@/lib/content/site";
import { NavLinks } from "@/components/layout/NavLinks";
import { MobileMenu } from "@/components/layout/MobileMenu";

interface NavbarProps {
  site: SiteConfig;
}

export function Navbar({ site }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50">
      {/* Precision orange top rule — editorial masthead signal */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent/60 to-transparent" aria-hidden="true" />

      <div className="border-b border-white/[0.07] bg-background/90 backdrop-blur-2xl">
        <div className="shell-wide flex h-[68px] items-center justify-between gap-8">

          {/* Left — Brand block */}
          <div className="flex min-w-0 shrink-0 items-center gap-5">
            <Link
              href="/"
              className="group flex items-center gap-3.5"
              aria-label={`${site.siteName} — Home`}
            >
              {/* Logo mark — slightly larger for editorial weight */}
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-[15px] font-black text-black transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(255,130,0,0.55)]">
                S
              </span>
              {/* Site name */}
              <span className="text-[16px] font-black uppercase tracking-[0.2em] text-white">
                {site.siteName}
              </span>
            </Link>

            {/* Divider + tagline — visible from 1024px */}
            <div className="hidden lg:flex items-center gap-3.5">
              <span className="h-4 w-px bg-white/20" aria-hidden="true" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45 whitespace-nowrap">
                {site.tagline}
              </p>
            </div>
          </div>

          {/* Right — Desktop nav */}
          <NavLinks links={site.navLinks} />

          {/* Mobile trigger */}
          <div className="md:hidden">
            <MobileMenu links={site.navLinks} siteName={site.siteName} />
          </div>
        </div>
      </div>
    </header>
  );
}
