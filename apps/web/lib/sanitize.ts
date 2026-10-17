import sanitizeHtml from "sanitize-html";

import { API_BASE } from "./api";

/**
 * Server-side HTML sanitizer for article bodies (Tiptap output).
 * sanitize-html is pure JS (htmlparser2) — safe in Next.js server bundles,
 * unlike jsdom-based DOMPurify which breaks static prerendering.
 */
export function sanitizeBody(dirty: string): string {
  const clean = sanitizeHtml(dirty, {
    allowedTags: [
      "p",
      "h2",
      "h3",
      "h4",
      "strong",
      "em",
      "s",
      "u",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "hr",
      "br",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "title", "rel"],
      img: ["src", "alt", "title"],
    },
    allowedSchemes: ["http", "https"],
    // Allow API-relative media (/uploads/…) and same-page anchors.
    allowProtocolRelative: false,
    enforceHtmlBoundary: false,
  });
  // Media is served by the API (/uploads/…), while article pages are rendered
  // by the web app — absolutize relative image srcs so they never 404.
  return clean.replace(/src="\/uploads\//g, `src="${API_BASE}/uploads/`);
}

/** Plain-text excerpt fallback when an article has no summary. */
export function textExcerpt(html: string, max = 160): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
}
