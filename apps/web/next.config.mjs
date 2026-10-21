import { securityHeaders } from "../../packages/config/security-headers.mjs";

/**
 * Image allowlist (SSRF fix): the optimizer used to accept ANY host
 * (remotePatterns: **), making /_next/image an open fetch proxy —
 * including cloud-metadata IPs. Now only the API host (self-hosted
 * /uploads/… covers), the site's own host, and explicit extras from
 * NEXT_PUBLIC_IMAGE_HOSTS (comma-separated "host[:port]") are allowed.
 */
function imageHosts() {
  const hosts = new Set();
  for (const raw of [
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "").split(","),
  ]) {
    const u = raw.trim();
    if (!u) continue;
    try {
      const parsed = new URL(u.includes("://") ? u : `https://${u}`);
      hosts.add(`${parsed.protocol}//${parsed.host}`);
    } catch {
      /* ignore malformed entries */
    }
  }
  return [...hosts].map((origin) => {
    const parsed = new URL(origin);
    const pattern = { protocol: parsed.protocol.replace(":", ""), hostname: parsed.hostname };
    if (parsed.port) pattern.port = parsed.port;
    return pattern;
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@srh/contracts"],
  images: {
    // The optimizer only emits WebP. AVIF is intentionally not enabled: it
    // reduces the supported attack surface and keeps cached variants small.
    formats: ["image/webp"],
    remotePatterns: imageHosts(),
    // Feed media is content-hashed and effectively immutable; keep optimized
    // variants on disk for 30 days instead of the 60s default so repeat views
    // never re-validate against the 4MB+ source PNGs.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders() }];
  },
};

export default nextConfig;
