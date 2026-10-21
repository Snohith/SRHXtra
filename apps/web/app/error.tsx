"use client";

import { useEffect } from "react";

/**
 * Route error boundary. API outages and contract errors reach this instead of
 * rendering a cached "story not found" page; readers get a retry.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="wrap" style={{ padding: "96px 0", textAlign: "center" }}>
      <h1>Something went wrong</h1>
      <p>We couldn&apos;t load this page right now. Please try again.</p>
      <button className="btn primary" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
