import { securityHeaders } from "../../packages/config/security-headers.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@srh/contracts"],
  async headers() {
    // Admin talks to the API cross-origin: allow it in connect-src.
    return [{ source: "/:path*", headers: securityHeaders({ connectApi: true }) }];
  },
};

export default nextConfig;
