import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "Copyright and acceptable-use terms for SRH Xtra's Sunrisers Hyderabad coverage.",
  alternates: { canonical: "/terms" },
  // Legal boilerplate: keep it reachable and followable, but out of search.
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  const year = new Date().getFullYear();
  return (
    <div className="wrap">
      <nav className="meta" aria-label="Breadcrumb" style={{ marginBottom: 4 }}>
        <Link href="/">Home</Link> · Terms of use
      </nav>
      <header className="article-head">
        <h1>Terms of use</h1>
        <p className="standfirst">
          The short version: read, link, and quote fairly — do not republish our
          text or lift our media.
        </p>
      </header>
      <div className="prose">
        <h2>Copyright</h2>
        <p>
          Original editorial text on this site is © {year} SRH Xtra. Copying,
          republishing, scraping, or redistributing it — in whole or in
          substantial part — without written permission is prohibited.
        </p>
        <p>
          Team names, logos, tournament imagery, and player photographs remain
          the property of their respective owners (for example, the Indian
          Premier League and Sunrisers Hyderabad) and appear here solely for
          editorial coverage. Their presence does not transfer any rights, and
          they may not be extracted for reuse elsewhere.
        </p>

        <h2>Permitted use</h2>
        <ul>
          <li>Reading, and sharing links to our stories.</li>
          <li>
            Quoting short excerpts with clear attribution to SRH Xtra and a link
            to the original story.
          </li>
          <li>Personal, non-commercial use of the site.</li>
        </ul>

        <h2>Prohibited use</h2>
        <ul>
          <li>
            Automated bulk copying, scraping, framing, or republishing of
            content.
          </li>
          <li>
            Removing, obscuring, or falsifying copyright notices or attribution.
          </li>
          <li>
            Using our content or media to imply endorsement or association
            without permission.
          </li>
        </ul>

        <h2>Enforcement</h2>
        <p>
          Content on this site is protected against automated copying and
          cross-site embedding, and unauthorised reuse may result in takedown
          requests to the hosting provider or platform involved. Requests for
          permission or removal can be raised with the site operator through our
          official channels.
        </p>
      </div>
    </div>
  );
}
