import type { NextConfig } from "next";

/**
 * NOTE: `cacheComponents` and `partialPrefetching` were enabled by create-next-app
 * defaults. Both are disabled here on purpose — see DECISIONS.md D-013.
 * The admin panel is fully dynamic (session cookies, DB reads); forcing every
 * dynamic read under a Suspense boundary adds risk without benefit at this stage.
 *
 * Security headers (MVP.md §6.1) are set here rather than in the proxy because
 * `headers()` applies to every response including static assets, and the proxy
 * matcher deliberately skips those for speed.
 */

/**
 * Content-Security-Policy.
 *
 * `unsafe-inline` on script-src is required by Next's inline bootstrap and by
 * the JSON-LD blocks; a nonce would mean threading one through every page and
 * giving up static rendering. `unsafe-eval` is development-only — React Refresh
 * needs it and production does not.
 *
 * img-src allows data: (inlined SVG) and https: (R2 media, once configured).
 */
function contentSecurityPolicy(isDev: boolean): string {
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Cloudflare R2 public bucket (Phase 3). Host filled in when the bucket exists.
      { protocol: "https", hostname: "**.r2.dev" },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // HSTS is production-only: sending it from localhost would pin
          // `localhost` to https in the developer's browser and break dev.
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
    ];
  },
};

export default nextConfig;
