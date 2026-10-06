import { notFound } from "next/navigation";

/**
 * Shared helpers for franchise-scoped routes (`app/[franchise]/...`).
 *
 * Hyderabad is the only franchise with live routes. Every page under
 * `[franchise]` validates its param through `assertLiveFranchise`, so future
 * franchises 404 cleanly until their `generateStaticParams` includes them.
 */

export const LIVE_FRANCHISE = "sunrisers-hyderabad" as const;

export function generateFranchiseStaticParams() {
  return [{ franchise: LIVE_FRANCHISE }];
}

/** Base path prefix for franchise-scoped content URLs. */
export function franchiseBasePath(franchise: string = LIVE_FRANCHISE) {
  return `/${franchise}`;
}

export async function assertLiveFranchise(
  params: Promise<{ franchise: string }>,
): Promise<typeof LIVE_FRANCHISE> {
  const { franchise } = await params;

  return assertLiveFranchiseValue(franchise);
}

/** Sync variant for pages that already awaited `params`. */
export function assertLiveFranchiseValue(franchise: string): typeof LIVE_FRANCHISE {
  if (franchise !== LIVE_FRANCHISE) {
    notFound();
  }

  return LIVE_FRANCHISE;
}
