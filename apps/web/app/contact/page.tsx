import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Contact the SRH Xtra desk with corrections, feedback, and general enquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="wrap">
      <nav className="meta" aria-label="Breadcrumb" style={{ marginBottom: 4 }}>
        <Link href="/">Home</Link> · Contact us
      </nav>
      <header className="article-head">
        <h1>Contact us</h1>
        <p className="standfirst">
          Corrections, feedback, and general enquiries — reach the SRH Xtra desk
          at the address below.
        </p>
      </header>
      <div className="prose" data-reveal="">
        <div className="contact-card">
          <p className="contact-label">Email</p>
          <a className="contact-email" href="mailto:srhxtra@outlook.com">
            srhxtra@outlook.com
          </a>
        </div>

        <h2>What to write to us about</h2>
        <ul>
          <li>
            <strong>Corrections</strong> — if something we have published is
            inaccurate or out of date, include a link to the story and what
            needs fixing. We will review it.
          </li>
          <li>
            <strong>Feedback and enquiries</strong> — thoughts on our coverage,
            or any other question about SRH Xtra.
          </li>
        </ul>

        <h2>On social</h2>
        <p>
          SRH Xtra is on X (
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
        <p>
          Privacy-related requests — such as asking what we hold about you or
          asking us to delete it — can also be sent to the address above.
        </p>
      </div>
    </div>
  );
}
