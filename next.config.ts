import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS only where the public origin is HTTPS (never on plain-http local or staging hosts)
  ...(process.env.NODE_ENV === "production" && process.env.APP_URL?.startsWith("https://") ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Allows a verification build next to a running server (NEXT_DIST_DIR=.next-verify npm run build)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  webpack(config) {
    // Konva's Node entry requires the native "canvas" package; the editor only runs in the browser.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
