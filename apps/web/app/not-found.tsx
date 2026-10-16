import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <h1>Story not found</h1>
      <p className="meta">The page you asked for doesn&apos;t exist or isn&apos;t published.</p>
      <p>
        <Link className="btn primary" href="/">
          Back to headlines
        </Link>
      </p>
    </div>
  );
}
