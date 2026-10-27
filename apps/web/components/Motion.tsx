"use client";

import { useEffect } from "react";

/**
 * Site-wide motion controller — the JS half of the animation layer
 * (`globals.css` holds the CSS half): scroll reveals, hero parallax, a
 * pointer-following spotlight, and the sticky-header state.
 *
 * IntersectionObservers and one rAF-throttled scroll loop drive the viewport
 * work. Scroll and reveal code writes only compositor-friendly properties
 * (opacity/transform); the spotlight writes two offsets for a transform-only
 * glow. Progressive enhancement is deliberate: reveal targets stay visible by
 * default and this controller only hides `[data-reveal]` elements that are
 * clearly below the viewport edge when it meets them — no-JS readers,
 * crawlers, and `prefers-reduced-motion` visitors always get the full static
 * page, and nothing above the fold waits on JS.
 *
 * Reveal targets (server markup):
 *   data-reveal                     — fade/slide in when scrolled into view
 *   data-reveal-delay="120"         — optional stagger, in milliseconds
 *   data-parallax="14"              — drift strength for hero images, in px
 *   data-spotlight                  — soft floodlight following the pointer
 */

const REVEAL_SELECTOR = "[data-reveal]";
const PARALLAX_SELECTOR = "[data-parallax]";
const SPOTLIGHT_SELECTOR = "[data-spotlight]";
const MOTION_TARGETS = `${REVEAL_SELECTOR}, ${PARALLAX_SELECTOR}`;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/**
 * Reveal threshold: an element is only pre-hidden while its top edge sits
 * below 88% of the viewport. Anything at least partially on screen (the
 * initial viewport, a restored scroll position, a route the user just
 * scrolled to) is left exactly as rendered — no flash, no waiting on
 * hydration.
 */
const HIDE_BELOW = 0.88;

/** Parallax drift is clamped so the overscan always covers the shift. */
const MAX_PARALLAX_PX = 24;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isHTMLElement(node: Node): node is HTMLElement {
  return node instanceof HTMLElement;
}

export default function Motion() {
  useEffect(() => {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;

    /* ---------------- Scroll reveals ---------------- */

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          reveal.unobserve(el);
          el.classList.remove("is-pending");
          el.classList.add("is-in");
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );

    const prepareReveal = (el: HTMLElement) => {
      if (el.classList.contains("is-in") || el.classList.contains("is-pending"))
        return;
      // On screen (or above the viewport) already — leave it alone.
      if (el.getBoundingClientRect().top <= window.innerHeight * HIDE_BELOW)
        return;
      const delay = Number(el.dataset.revealDelay ?? 0);
      if (delay > 0) el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.classList.add("is-pending");
      reveal.observe(el);
    };

    /* ---------------- Hero parallax ---------------- */

    const parallaxed = new Set<HTMLElement>();
    const parallaxVisible = new Set<HTMLElement>();

    // Only elements near the viewport are tracked as "visible"; the scroll
    // loop touches nothing else.
    const parallaxWatch = new IntersectionObserver(
      (entries) => {
        let changed = false;
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            if (!parallaxVisible.has(el)) {
              parallaxVisible.add(el);
              changed = true;
            }
          } else if (parallaxVisible.delete(el)) {
            changed = true;
          }
        }
        if (changed) schedule();
      },
      { rootMargin: "30% 0px 30% 0px" },
    );

    const prepareParallax = (el: HTMLElement) => {
      if (parallaxed.has(el)) return;
      parallaxed.add(el);
      // The class buys the image its slight overscan (see globals.css);
      // the translate itself comes from --parallax-y below.
      el.classList.add("parallax-on");
      parallaxWatch.observe(el);
    };

    const updateParallax = () => {
      if (parallaxVisible.size === 0) return;
      const vh = window.innerHeight;
      for (const el of parallaxVisible) {
        const rect = el.getBoundingClientRect();
        // -1 entering from below → +1 leaving above.
        const progress = Math.max(
          -1,
          Math.min(
            1,
            (vh / 2 - (rect.top + rect.height / 2)) / ((vh + rect.height) / 2),
          ),
        );
        const strength = Math.min(
          MAX_PARALLAX_PX,
          Math.max(0, Number(el.dataset.parallax) || 12),
        );
        el.style.setProperty(
          "--parallax-y",
          `${(progress * strength).toFixed(2)}px`,
        );
      }
    };

    /* ---------------- Sticky header ---------------- */

    const header = document.querySelector<HTMLElement>(".site-header");
    let headerScrolled = false;

    const updateHeader = () => {
      if (!header) return;
      const y = window.scrollY;
      // Hysteresis: engage past 30px, release near the top only.
      const next = headerScrolled ? y > 10 : y > 30;
      if (next !== headerScrolled) {
        headerScrolled = next;
        header.classList.toggle("is-scrolled", next);
      }
    };

    /* ---------------- Pointer spotlight ---------------- */

    // The glow itself is a CSS pseudo-element; this only writes the pointer
    // position as two custom properties. A document-level pointermove avoids
    // per-element listeners and survives route swaps. Touch input is ignored,
    // and a single rAF caps writes at one per frame.
    const finePointer = window.matchMedia(FINE_POINTER);
    let spotFrame = 0;
    let spotTarget: HTMLElement | null = null;
    let spotX = 0;
    let spotY = 0;

    const paintSpotlight = () => {
      spotFrame = 0;
      const el = spotTarget;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Offset from the panel centre: a fixed-size glow is moved by transform
      // (compositor-friendly), never a repainted background gradient.
      el.style.setProperty(
        "--spot-dx",
        `${(spotX - (rect.left + rect.width / 2)).toFixed(0)}px`,
      );
      el.style.setProperty(
        "--spot-dy",
        `${(spotY - (rect.top + rect.height / 2)).toFixed(0)}px`,
      );
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || !(event.target instanceof Element)) return;
      const el = event.target.closest<HTMLElement>(SPOTLIGHT_SELECTOR);
      if (!el) return;
      spotTarget = el;
      spotX = event.clientX;
      spotY = event.clientY;
      if (!spotFrame) spotFrame = requestAnimationFrame(paintSpotlight);
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });

    /* ---------------- Frame scheduler ---------------- */

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateHeader();
        updateParallax();
      });
    };

    /* ---------------- DOM adoption ---------------- */

    const adopt = (node: HTMLElement) => {
      if (node.matches(REVEAL_SELECTOR)) prepareReveal(node);
      if (node.matches(PARALLAX_SELECTOR)) prepareParallax(node);
      for (const el of node.querySelectorAll<HTMLElement>(MOTION_TARGETS)) {
        if (el.matches(REVEAL_SELECTOR)) prepareReveal(el);
        if (el.matches(PARALLAX_SELECTOR)) prepareParallax(el);
      }
    };

    const drop = (node: HTMLElement) => {
      if (node.matches(REVEAL_SELECTOR)) reveal.unobserve(node);
      for (const el of node.querySelectorAll<HTMLElement>(REVEAL_SELECTOR)) {
        reveal.unobserve(el);
      }
      if (node.matches(PARALLAX_SELECTOR)) {
        parallaxVisible.delete(node);
        parallaxed.delete(node);
        parallaxWatch.unobserve(node);
      }
      for (const el of node.querySelectorAll<HTMLElement>(PARALLAX_SELECTOR)) {
        parallaxVisible.delete(el);
        parallaxed.delete(el);
        parallaxWatch.unobserve(el);
      }
    };

    // Route changes swap entire page trees and the roster re-renders on
    // every filter keystroke — adopt whatever React mounts, drop what it
    // unmounts.
    const dom = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes)
          if (isHTMLElement(node)) adopt(node);
        for (const node of record.removedNodes)
          if (isHTMLElement(node)) drop(node);
      }
    });
    dom.observe(document.body, { childList: true, subtree: true });

    document
      .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
      .forEach(prepareReveal);
    document
      .querySelectorAll<HTMLElement>(PARALLAX_SELECTOR)
      .forEach(prepareParallax);
    updateHeader();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (spotFrame) cancelAnimationFrame(spotFrame);
      reveal.disconnect();
      parallaxWatch.disconnect();
      dom.disconnect();
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      // Strict-mode remounts (dev) restart from a clean slate: un-hide
      // anything this instance had pending so the next one re-decides.
      document
        .querySelectorAll<HTMLElement>(`${REVEAL_SELECTOR}.is-pending`)
        .forEach((el) => {
          el.classList.remove("is-pending");
          el.style.removeProperty("--reveal-delay");
        });
    };
  }, []);

  return null;
}
