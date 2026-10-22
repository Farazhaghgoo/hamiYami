import type { NextConfig } from "next";
import { assertValidConfig } from "./src/server/env";

// Fail the build (and server start) if real signup collection is switched on without everything it
// needs. With collection off, which is the default, this never throws.
assertValidConfig(process.env);

/*
 * Static security headers for every response. The Content-Security-Policy needs a fresh nonce per
 * request, so it is set in src/proxy.ts instead.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    // Browsers ask for /favicon.ico by default; serve the existing PNG icon.
    return [{ source: "/favicon.ico", destination: "/favicon-32.png" }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }],
      },
    ];
  },
};

export default nextConfig;
