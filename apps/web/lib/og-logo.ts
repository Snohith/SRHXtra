import { readFileSync } from "node:fs";
import { join } from "node:path";

let cached: string | undefined;

/**
 * The SRH Xtra logo as an inline data URI for ImageResponse (OG) cards — read
 * once per server process from `public/logo.png` so social cards always carry
 * the real brand mark without a network round-trip.
 */
export function logoDataUri(): string {
  if (!cached) {
    const file = readFileSync(join(process.cwd(), "public", "logo.png"));
    cached = `data:image/png;base64,${file.toString("base64")}`;
  }
  return cached;
}
