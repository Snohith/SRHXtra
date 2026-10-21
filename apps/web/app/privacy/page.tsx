import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How SRH Xtra handles information when you visit our website or contact us.",
  alternates: { canonical: "/privacy" },
  // Legal boilerplate: keep it reachable and followable, but out of search.
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="wrap">
      <nav className="meta" aria-label="Breadcrumb" style={{ marginBottom: 4 }}>
        <Link href="/">Home</Link> · Privacy policy
      </nav>
      <header className="article-head">
        <h1>Privacy policy</h1>
        <p className="standfirst">
          The short version: you can read everything on SRH Xtra without an
          account, we do not run advertising or tracking, and we only use what
          you send us to reply.
        </p>
      </header>
      <div className="prose" data-reveal="">
        <h2>Scope</h2>
        <p>
          This policy explains how SRH Xtra handles information in connection
          with this website. It covers this site and messages sent to us; the
          external platforms we link to are governed by their own policies.
        </p>

        <h2>Reading SRH Xtra</h2>
        <p>
          You do not need an account or any personal details to read this site,
          and we do not ask for them. The site is not supported by advertising,
          we do not use third-party analytics or tracking tools, and we do not
          set cookies on your device.
        </p>

        <h2>Server logs</h2>
        <p>
          Like most websites, our servers keep standard technical logs — such as
          the pages requested, the time of each request, browser type, and IP
          address. These logs are used to keep the site secure, diagnose
          problems, and keep the service running reliably.
        </p>

        <h2>When you contact us</h2>
        <p>
          If you email us or message us on social media, we receive what you
          send — typically your email address or account and your message. We
          use it only to respond to your enquiry or act on your correction. We
          do not add you to mailing lists, and we do not sell or share your
          details. Correspondence is kept only for as long as needed to handle
          your request, and you can ask us what we hold about you — or ask us to
          delete it — by writing to{" "}
          <a href="mailto:srhxtra@outlook.com">srhxtra@outlook.com</a>.
        </p>

        <h2>External links</h2>
        <p>
          Our pages link to other platforms, including X and Instagram. Once you
          follow a link to an external service, that service’s own privacy
          policy applies.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If this policy changes, the update will appear on this page with a new
          date below.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy can be sent to{" "}
          <a href="mailto:srhxtra@outlook.com">srhxtra@outlook.com</a>.
        </p>

        <p className="meta">Last updated: October 2026</p>
      </div>
    </div>
  );
}
