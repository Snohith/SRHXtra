import { ImageResponse } from "next/og";

import { logoDataUri } from "@/lib/og-logo";
import { getProfile } from "@/lib/players";

/**
 * Per-player Open Graph card — charcoal canvas, SRH orange accent, the
 * player's jersey number as a watermark. Generated for every profile at
 * request time and cached by the route.
 */

export const runtime = "nodejs";
export const alt = "SRH Xtra player profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage({
  params,
}: {
  params: { playerSlug: string };
}) {
  const profile = getProfile(params.playerSlug);
  const name = profile?.player.name ?? "Sunrisers Hyderabad";
  const kicker = profile
    ? `${profile.roleLabel.toUpperCase()} · IPL 2026`
    : "IPL 2026";
  const meta = profile
    ? [
        profile.country.country,
        profile.jerseyNumber !== undefined
          ? `Jersey #${profile.jerseyNumber}`
          : null,
        profile.matches !== undefined ? `${profile.matches} IPL matches` : null,
      ]
        .filter(Boolean)
        .join("   ·   ")
    : "Player profile";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#191c20",
        color: "#ffffff",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {profile?.jerseyNumber !== undefined && (
        <div
          style={{
            position: "absolute",
            right: 30,
            bottom: -90,
            display: "flex",
            fontSize: 420,
            fontWeight: 800,
            lineHeight: 1,
            color: "rgba(242, 101, 34, 0.18)",
            letterSpacing: -10,
          }}
        >
          {profile.jerseyNumber}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          width: "100%",
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
          <div
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            PLAYER PROFILE
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: 880,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 2,
              color: "#ffb584",
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.04,
            }}
          >
            {name}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#c9c6c0" }}>
            {meta}
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
      </div>
    </div>,
    size,
  );
}
