import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/api";

export const metadata: Metadata = {
  title: "About us",
  description:
    "SRH Xtra is a digital sports publication covering the Sunrisers Hyderabad — team news, match reports, squad updates, and tactical analysis.",
  alternates: { canonical: "/about" },
};

/** Organization details for search engines; every value reflects the live site. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SRH Xtra",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  email: "srhxtra@outlook.com",
  description: "Digital sports publication covering the Sunrisers Hyderabad.",
  sameAs: ["https://x.com/SRH_Xtra", "https://www.instagram.com/srh_xtra/"],
};

export default function AboutPage() {
  return (
    <div className="wrap">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="meta" aria-label="Breadcrumb" style={{ marginBottom: 4 }}>
        <Link href="/">Home</Link> · About us
      </nav>
      <header className="article-head">
        <h1>About us</h1>
        <p className="standfirst">
          SRH Xtra is a digital sports publication covering the Sunrisers
          Hyderabad across the season.
        </p>
      </header>
      <div className="prose">
        <h2>What we cover</h2>
        <p>
          SRH Xtra follows the Sunrisers Hyderabad through the season: team news
          and squad updates, match reports, and tactical analysis of how the
          side plays. Coverage is published across our news, matches, and squad
          sections.
        </p>

        <h2>How we work</h2>
        <p>
          Stories are drafted, reviewed, and published through our editorial
          workflow, and changes to published stories are recorded in a revision
          history. If we get something wrong, we want to know — write to us and
          we will review it.
        </p>

        <h2>Independence</h2>
        <p>
          SRH Xtra is an independent publication. We are not affiliated with,
          endorsed by, or sponsored by Sunrisers Hyderabad, the Indian Premier
          League, or the BCCI. Team names, logos, tournament imagery, and player
          photographs remain the property of their respective owners and appear
          on this site solely for editorial coverage.
        </p>

        <h2>Get in touch</h2>
        <p>
          Questions, feedback, or a correction? Write to{" "}
          <a href="mailto:srhxtra@outlook.com">srhxtra@outlook.com</a> or use
          our <Link href="/contact">contact page</Link>. You can also find us on
          X (
          <a
            href="https://x.com/SRH_Xtra"
            target="_blank"
            rel="noopener noreferrer"
          >
            @SRH_Xtra
          </a>
          ) and Instagram (
          <a
            href="https://www.instagram.com/srh_xtra/"
            target="_blank"
            rel="noopener noreferrer"
          >
            @srh_xtra
          </a>
          ).
        </p>
      </div>
    </div>
  );
}
