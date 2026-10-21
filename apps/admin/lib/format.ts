/** Date / initial helpers shared across the admin UI. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "4m ago", "3h ago", "2d ago", then an absolute date. */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "—";
  if (diff < 45_000) return "just now";
  if (diff < HOUR) return `${Math.max(1, Math.round(diff / MINUTE))}m ago`;
  if (diff < DAY) return `${Math.round(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.round(diff / DAY)}d ago`;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Good morning" · "Good afternoon" · "Good evening" — by local clock. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Up to two uppercase initials from a display name or email. */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const base = name.includes("@") ? name.split("@")[0] : name;
  const parts = base
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/);
  const chars = parts
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("");
  return (chars || base.charAt(0) || "?").toUpperCase();
}

/** Deterministic soft avatar colors from a name/email seed. */
export function avatarColors(seed: string | null | undefined): {
  bg: string;
  ink: string;
} {
  const PALETTE = [
    { bg: "#fbe3d0", ink: "#8a3d0e" },
    { bg: "#e4ecfd", ink: "#1f4fa8" },
    { bg: "#e0f4e7", ink: "#136b39" },
    { bg: "#f3e8fd", ink: "#6427a8" },
    { bg: "#fde9ec", ink: "#a12634" },
    { bg: "#fdf3d8", ink: "#7c5a09" },
  ];
  let hash = 0;
  const s = seed ?? "";
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/** Track a number with a short count-up animation (respects reduced motion). */
export function countUp(
  target: number,
  onTick: (value: number) => void,
  ms = 550,
): () => void {
  if (
    typeof window === "undefined" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    target <= 0
  ) {
    onTick(target);
    return () => undefined;
  }
  const start = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3);
    onTick(Math.round(target * eased));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
