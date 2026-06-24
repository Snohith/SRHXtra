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

      <div className="border-b border-white/10 bg-black shadow-[0_10px_28px_rgba(0,0,0,0.2)]">
        <div className="shell-wide flex h-[68px] items-center justify-between gap-3 sm:gap-8">

          {/* Left — Brand block */}
          <div className="flex min-w-0 shrink items-center gap-2.5 sm:gap-5">
            <Link
              href="/"
              className="group flex min-w-0 items-center gap-2.5 sm:gap-3.5"
              aria-label={`${site.siteName} — Home`}
            >
              {/* Logo mark — updated with new brand asset */}
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-accent/10 p-0.5 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(255,109,0,0.3)] sm:h-10 sm:w-10 sm:rounded-xl">
                <img
                  src="/images/site/logo-mark.svg"
                  alt=""
                  className="h-full w-full object-contain"
                  height={40}
                  width={40}
                />
              </div>
              {/* Site name */}
              <span className="truncate text-[11px] font-black uppercase tracking-[0.18em] text-white sm:text-[16px] sm:tracking-[0.2em]">
                {site.siteName}
              </span>
            </Link>


          </div>

          {/* Right — Desktop nav */}
          <NavLinks links={site.navLinks} />

          {/* Mobile trigger */}
          <div className="shrink-0 md:hidden">
            <MobileMenu links={site.navLinks} siteName={site.siteName} />
          </div>
        </div>
      </div>
    </header>
  );
}
