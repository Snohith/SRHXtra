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
          SRH <em>News</em>
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
        </nav>
        <span>
          SRH News — fan-focused Sunrisers Hyderabad coverage. Scores and stats
          arrive after launch.
        </span>
      </div>
    </footer>
  );
}
