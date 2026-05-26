import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  // The swarm runs `next dev` against the default `.next`. Pre-push runs
  // `next build` (production) — sharing `.next` makes the two clobber each
  // other's cache, so every pre-push build runs fully cold (~5 min) and the
  // dev server has to rebuild afterwards. Route the pre-push production build
  // to its own dist dir so each keeps a warm, isolated incremental cache.
  // The pre-push hook sets NEXT_PREPUSH_BUILD=1; dev and CI use `.next`.
  distDir: process.env.NEXT_PREPUSH_BUILD === "1" ? ".next-prepush" : ".next",
  transpilePackages: [
    "@annix/product-data",
    "@annix/feedback-sdk",
    "@annix/feedback-web",
  ],

  async redirects() {
    return [
      // Permanent redirect: the CV Assistant module was renamed to Annix Orbit
      // and its routes moved under /annix/orbit/*. Keep old URLs working so
      // external bookmarks, emailed links, and search-engine results don't 404.
      {
        source: "/cv-assistant",
        destination: "/annix/orbit",
        permanent: true,
      },
      {
        source: "/cv-assistant/:path*",
        destination: "/annix/orbit/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    // An immutable, year-long cache is only safe for production builds, whose
    // /_next/static filenames are content-hashed. Turbopack dev chunks reuse
    // stable names, so an immutable header would pin stale code in the browser
    // across every edit — apply this rule in production only.
    const isProduction = process.env.NODE_ENV === "production";
    const productionStaticCaching = isProduction
      ? [
          {
            source: "/_next/static/:path*",
            headers: [
              { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
            ],
          },
        ]
      : [];
    // Turbopack dev chunks reuse stable filenames across rebuilds, so the
    // browser's HTTP cache will pin a stale chunk under the same URL after a
    // rebuild — surfacing as "module factory is not available" runtime errors
    // until a manual hard-reload. Force no-store in dev so every chunk is
    // re-fetched fresh.
    const developmentStaticCaching = isProduction
      ? []
      : [
          {
            source: "/_next/static/:path*",
            headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
          },
        ];
    return [
      ...productionStaticCaching,
      ...developmentStaticCaching,
      {
        // Marketing-site images: long cache, but revalidate so a swapped
        // banner is eventually picked up (these filenames are not hashed).
        source: "/au-industries/:all*(jpg|jpeg|png|webp|avif|svg|ico|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/annix-rep/:path*",
        destination: "/fieldflow/:path*",
      },
    ];
  },

  experimental: {
    optimizePackageImports: [
      "es-toolkit",
      "luxon",
      "immer",
      "zod",
      "zustand",
      "react-hook-form",
    ],
  },

  modularizeImports: {
    "@heroicons/react/24/outline": {
      transform: "@heroicons/react/24/outline/{{member}}",
    },
    "@heroicons/react/24/solid": {
      transform: "@heroicons/react/24/solid/{{member}}",
    },
  },
};

export default nextConfig;
