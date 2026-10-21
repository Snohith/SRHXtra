"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scoreboard count-up for stat values ("412", "1,204", "45.60", "43 / 21").
 *
 * The server renders the final number, so the stat is complete for no-JS
 * readers and crawlers; with motion enabled the value ticks up from zero
 * the first time it scrolls into view. `prefers-reduced-motion` skips
 * straight to the final value.
 */

/** Splits "45.60" / "1,204" / "43 / 21" into prefix, digits, suffix. */
const NUMBER_PARTS = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

const DURATION_MS = 950;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export default function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const parts = value.match(NUMBER_PARTS);
    if (!parts) return;
    const prefix = parts[1] ?? "";
    const digits = parts[2] ?? "";
    const suffix = parts[3] ?? "";
    const target = Number.parseFloat(digits.replace(/,/g, ""));
    if (!Number.isFinite(target) || target <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const decimals = digits.includes(".") ? digits.split(".")[1].length : 0;
    // en-IN matches how the stats are authored ("4,812").
    const format = (n: number) =>
      n.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

    let frame = 0;

    const run = () => {
      setDisplay(`${prefix}${format(0)}${suffix}`);
      const started = performance.now();
      const tick = (now: number) => {
        // Clamp both ends: the first rAF timestamp can precede `started`,
        // which would otherwise flash a negative value for one frame.
        const t = Math.min(1, Math.max(0, (now - started) / DURATION_MS));
        setDisplay(`${prefix}${format(target * easeOutCubic(t))}${suffix}`);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.disconnect();
          run();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{display}</span>;
}
