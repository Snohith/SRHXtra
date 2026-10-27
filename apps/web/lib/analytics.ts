/**
 * Google Analytics 4 wiring for the public site.
 *
 * The measurement ID can be overridden per environment; it falls back to the
 * live property so a deploy that forgets the env var still tracks. Set
 * NEXT_PUBLIC_GA_ID to an empty value to switch analytics off (local dev).
 */
export const GA_ID =
  process.env.NEXT_PUBLIC_GA_ID ?? "G-51L8S5M17X";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    /** Events fired before gtag.js finished loading. Flushed by the init script. */
    __gaQueue?: Array<[string, EventParams]>;
  }
}

/**
 * Queue-safe wrapper: the tag loads after hydration, so early events wait in
 * `__gaQueue` and the inline init script replays them after `config`.
 */
export function track(event: string, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  if (window.gtag) {
    window.gtag("event", event, params);
    return;
  }
  (window.__gaQueue ??= []).push([event, params]);
}
