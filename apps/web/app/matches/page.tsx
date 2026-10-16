import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SRH matches",
  description: "Sunrisers Hyderabad fixtures, results, and scorecards — arriving after the core news launch.",
  alternates: { canonical: "/matches" },
};

export default function MatchesPage() {
  return (
    <div className="wrap">
      <h1 style={{ margin: "4px 0 2px" }}>Matches</h1>
      <p className="meta" style={{ marginBottom: 12 }}>
        Fixtures, results, previews, and post-match analysis.
      </p>
      <div className="empty">
        <strong>Coming soon.</strong>
        <br />
        Structured fixtures and scorecards land after the core news experience launches.
        Meanwhile, read the latest <Link href="/news?category=match-reports">match reports</Link>.
      </div>
    </div>
  );
}
