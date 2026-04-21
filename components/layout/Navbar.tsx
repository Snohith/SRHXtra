import Link from "next/link";

import type { SiteConfig } from "@/lib/content/site";
import { MobileMenu } from "@/components/layout/MobileMenu";

interface NavbarProps {
  site: SiteConfig;
}

export function Navbar({ site }: NavbarProps) {
  return (
    <header className="sticky top-6 z-50 px-5 sm:px-8">
      <div className="shell-wide glass-panel flex items-center justify-between gap-6 py-4 px-6 sm:px-10">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-black text-black transition-transform group-hover:rotate-12">
              S
            </span>
            <span className="text-xl font-black uppercase tracking-[0.2em] text-white">
              {site.siteName}
            </span>
          </Link>
          <div className="hidden min-[1100px]:block">
            <span className="h-4 w-[1px] bg-white/20 mx-2 inline-block align-middle" />
            <p className="inline-block text-xs font-medium uppercase tracking-widest text-muted">{site.tagline}</p>
          </div>
        </div>

        <nav className="hidden items-center gap-2 md:flex">
          {site.navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-5 py-2 text-xs font-bold uppercase tracking-widest text-muted transition-all hover:bg-white/5 hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="md:hidden">
          <MobileMenu links={site.navLinks} />
        </div>
      </div>
    </header>
  );
}
