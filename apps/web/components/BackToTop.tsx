"use client";

import { useEffect, useState } from "react";

/**
 * Floating "back to top" button — appears once the reader is past the
 * first viewport, fades out near the top. Hysteresis (900px on, 600px off)
 * keeps it from flickering around the threshold. Honours reduced motion
 * by jumping instantly instead of smooth-scrolling.
 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    let shown = false;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const next = shown ? y > 600 : y > 900;
      if (next !== shown) {
        shown = next;
        setVisible(next);
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <button
      type="button"
      className={`to-top${visible ? " is-visible" : ""}`}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => {
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M12 19V5m-6 6 6-6 6 6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
