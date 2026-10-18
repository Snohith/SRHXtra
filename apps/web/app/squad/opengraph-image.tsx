import { ImageResponse } from "next/og";

import { logoDataUri } from "@/lib/og-logo";
import { CAPTAIN, HEAD_COACH, OVERSEAS_COUNT, SQUAD } from "@/lib/squad";

/**
 * Squad-page Open Graph card (Step 5 SEO): branded charcoal + SRH orange,
 * matching the site-wide card with the 2026 roster facts.
 */
export const runtime = "nodejs";
export const alt =
  "SRH Xtra squad — IPL 2026: 25 players, 8 overseas, captain Pat Cummins";
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
        <img
          src={logoDataUri()}
          width={72}
          height={72}
          alt=""
          style={{ borderRadius: 16 }}
        />
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 3 }}>
          SRH XTRA
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            color: "#f26522",
            border: "3px solid #f26522",
            borderRadius: 999,
            padding: "8px 26px",
          }}
        >
          IPL 2026 SQUAD
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 800 }}>
          The 2026 squad
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#c9c6c0" }}>
          {`${SQUAD.length} players · ${OVERSEAS_COUNT} overseas · Captain ${CAPTAIN?.name}`}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#8f959e" }}>
          {`Head coach ${HEAD_COACH}`}
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
