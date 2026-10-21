/**
 * Serialize JSON-LD for an inline <script>. Escaping <, > and & as unicode
 * escapes prevents a title/summary containing "</script>" from closing the
 * tag and injecting markup into the public page.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
