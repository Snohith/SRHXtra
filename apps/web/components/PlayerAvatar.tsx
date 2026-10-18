import Image from "next/image";

import { initials, type SquadPlayer } from "@/lib/squad";

/**
 * Player headshot with a branded initials fallback. Used by the squad page
 * (server) and the roster grid (client) — the avatar is decorative because
 * the player's name always sits next to it.
 *
 * - `card`: 64px avatar used in the roster grid.
 * - `feature`: large portrait used for the captain card.
 *
 * `src` optionally overrides the headshot with the official feed's 2:3 kit
 * portrait (referenced by its published URL); players without one keep the
 * IPL headshot or initials.
 */
export default function PlayerAvatar({
  player,
  variant = "card",
  priority = false,
  src,
}: {
  player: SquadPlayer;
  variant?: "card" | "feature";
  priority?: boolean;
  src?: string;
}) {
  const imageSrc = src ?? player.headshot;
  // Feed portraits are 2:3 cutouts — same treatment as the squad's portrait
  // headshots (no zoom, face-focused framing).
  const portrait = src ? true : player.headshotPortrait;

  if (imageSrc) {
    const px = variant === "feature" ? 288 : 128;
    return (
      <span
        className={`player-photo${variant === "feature" ? " feature" : ""}${
          portrait ? " portrait" : ""
        }`}
        aria-hidden="true"
      >
        <Image
          src={imageSrc}
          alt=""
          width={px}
          height={px}
          sizes={variant === "feature" ? "144px" : "64px"}
          priority={priority}
        />
      </span>
    );
  }
  return (
    <span
      className={`player-avatar${variant === "feature" ? " feature" : ""}`}
      aria-hidden="true"
    >
      {initials(player.name)}
    </span>
  );
}
