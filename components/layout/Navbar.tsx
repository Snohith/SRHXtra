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
      {/* Subtle top accent rule */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-accent/50 to-transparent" aria-hidden="true" />

      <div className="border-b border-white/[0.06] bg-background/85 backdrop-blur-xl">
        <div className="shell-wide flex h-14 items-center justify-between gap-6">

          {/* Left — Brand */}
          <div className="flex min-w-0 shrink-0 items-center gap-4">
            <Link
              href="/"
              className="group flex items-center gap-3"
              aria-label={`${site.siteName} — Home`}
            >
              {/* Logo mark */}
              <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent font-black text-sm text-black transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(255,130,0,0.6)]">
                S
              </span>
              {/* Site name */}
              <span className="text-[15px] font-black uppercase tracking-[0.18em] text-white">
                {site.siteName}
              </span>
            </Link>

            {/* Divider + Tagline — hidden below 1100px */}
            <div className="hidden min-[1100px]:flex items-center gap-3">
              <span className="h-3.5 w-px bg-white/15" aria-hidden="true" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">
                {site.tagline}
              </p>
            </div>
          </div>

          {/* Center / Right — Desktop Nav */}
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
