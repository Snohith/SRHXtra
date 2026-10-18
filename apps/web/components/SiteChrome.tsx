import Image from "next/image";
import Link from "next/link";
import MobileNav from "./MobileNav";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/news", label: "News" },
  { href: "/squad", label: "Squad" },
  { href: "/matches", label: "Matches" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <div className="header-inner">
        <Link className="brand" href="/">
          <Image
            className="brand-logo"
            src="/logo.png"
            alt=""
            width={34}
            height={34}
            priority
          />
          SRH <em>Xtra</em>
        </Link>
        <nav className="nav-desktop" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
        <MobileNav />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <nav aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/news">News</Link>
          <Link href="/squad">Squad</Link>
          <Link href="/matches">Matches</Link>
          <Link href="/terms">Terms of use</Link>
        </nav>
        <span>SRH Xtra — fan-focused Sunrisers Hyderabad coverage.</span>
        <span className="footer-copy">
          © {new Date().getFullYear()} SRH Xtra. All rights reserved. Text and
          media may not be reproduced without permission.
        </span>
      </div>
    </footer>
  );
}
