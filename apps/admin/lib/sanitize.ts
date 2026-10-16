/**
 * HTML sanitizer for rendered article bodies (preview + any published HTML).
 * dompurify is imported lazily so jsdom/DOM code never loads during Next.js
 * static prerendering — sanitization always happens in the browser.
 */
export async function sanitizeHtml(html: string): Promise<string> {
  const { default: createDOMPurify } = await import("dompurify");
  return createDOMPurify(window).sanitize(html);
}
