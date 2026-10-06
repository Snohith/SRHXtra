import Link from "next/link";

import type { SiteConfig } from "@/lib/content/site";

interface FooterProps {
  site: SiteConfig;
}

const socialLabelMap: Record<string, string> = {
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  email: "Email",
};

export function Footer({ site }: FooterProps) {
  const socialLinks = Object.entries(site.socials).map(([label, href]) => {
    if (!href) {
      return null;
    }

    const resolvedHref = label.toLowerCase() === "email" && !href.startsWith("mailto:") ? `mailto:${href}` : href;

    return {
      href: resolvedHref,
      label: socialLabelMap[label] ?? label,
    };
  });

  return (
    <footer className="mt-32 border-t border-white/10 bg-black text-white">
      <div className="shell-wide py-12 sm:py-20">
        <div className="grid gap-10 sm:gap-16 lg:grid-cols-[1.5fr_1fr]">
          <div className="max-w-3xl min-w-0">
            <Link href="/" className="flex min-w-0 items-center gap-4 group">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white p-1.5 transition-transform group-hover:rotate-6">
                <img
                  src="/logo.png"
                  alt="Sunrisers Xtra brand logo"
                  className="h-full w-full object-contain"
                  height={56}
                  loading="lazy"
                  width={56}
                />
              </div>
              <span className="min-w-0 break-words text-xl font-black uppercase tracking-[0.2em] text-white sm:text-3xl">
                {site.siteName}
              </span>
            </Link>
            <h2 className="mt-8 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
              {site.footerHeadline}
            </h2>
            <p className="mt-6 text-sm text-neutral-400 max-w-2xl leading-relaxed">{site.organization.description}</p>
          </div>
          
          <div className="grid gap-10 sm:grid-cols-2 lg:justify-end">
            <div className="lg:min-w-[180px]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Navigation</h3>
              <ul className="mt-6 grid gap-4 text-sm font-medium">
                {site.footerLinks.map((link) => (
                  <li key={link.href}>
                    <Link className="text-neutral-400 transition-colors hover:text-white" href={link.href}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:min-w-[180px]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">Social</h3>
              <ul className="mt-6 grid gap-4 text-sm font-medium">
                {socialLinks.map((entry) =>
                  entry ? (
                    <li key={entry.label}>
                      <a className="text-neutral-400 transition-colors hover:text-white" href={entry.href}>
                        {entry.label}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-12 flex flex-col gap-6 border-t border-white/10 pt-10 sm:mt-20 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            &copy; {new Date().getFullYear()} {site.siteName}. Independent SRH Coverage.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            <Link href="/sunrisers-hyderabad/about-us" className="hover:text-white">About Us</Link>
            <Link href="/sitemap.xml" className="hover:text-white">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
