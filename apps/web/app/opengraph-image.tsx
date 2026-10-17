import { ImageResponse } from "next/og";

/**
 * Site-wide Open Graph image (Step 5 SEO): used by the homepage, listings, and
 * any route without its own generated image. Branded, dark charcoal + SRH orange.
 */
export const runtime = "nodejs";
export const alt = "SRH News — Sunrisers Hyderabad news, reports & analysis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#191c20",
        padding: 64,
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div
          style={{
            width: 72,
            height: 72,
            background: "#f26522",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            fontWeight: 800,
            color: "#191c20",
          }}
        >
          SRH
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 3 }}>
          SRH NEWS
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.06 }}>
          Sunrisers Hyderabad, covered properly.
        </div>
        <div style={{ fontSize: 34, color: "#c9c6c0" }}>
          Match reports · Squad updates · Tactical analysis
        </div>
      </div>
      <div
        style={{
          display: "flex",
          height: 12,
          background: "#f26522",
          borderRadius: 6,
        }}
      />
    </div>,
    size,
  );
}
