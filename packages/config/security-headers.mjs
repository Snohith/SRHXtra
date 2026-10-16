/**
 * Shared security headers for the Next.js frontends.
 * CSP keeps 'unsafe-inline' for scripts/styles because Next.js + Tiptap
 * require it; the policy still bans plugins/frames/foreign connections,
 * which is where the residual XSS/drive-by value lives.
 */
function apiOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").origin;
  } catch {
    return "http://localhost:4000";
  }
}

export function securityHeaders({ connectApi = false } = {}) {
  const connect = ["'self'", ...(connectApi ? [apiOrigin()] : [])].join(" ");
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: http: https:`,
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    { key: "Content-Security-Policy", value: csp },
  ];
}
