import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SRH squad",
  description:
    "Sunrisers Hyderabad squad profiles and season stats — arriving after the core news launch.",
  alternates: { canonical: "/squad" },
};

export default function SquadPage() {
  return (
    <div className="wrap">
      <h1 style={{ margin: "4px 0 2px" }}>Squad</h1>
      <p className="meta" style={{ marginBottom: 12 }}>
        Player profiles, roles, and season statistics.
      </p>
      <div className="empty">
        <strong>Coming soon.</strong>
        <br />
        Structured player data lands after the core news experience launches.
        Meanwhile, catch up on{" "}
        <Link href="/news?category=squad-updates">squad updates</Link>.
      </div>
    </div>
  );
}
