import type { NextConfig } from "next";

/**
 * NOTE: `cacheComponents` and `partialPrefetching` were enabled by create-next-app
 * defaults. Both are disabled here on purpose — see DECISIONS.md D-013.
 * The admin panel is fully dynamic (session cookies, DB reads); forcing every
 * dynamic read under a Suspense boundary adds risk without benefit at this stage.
 */
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
};

export default nextConfig;
