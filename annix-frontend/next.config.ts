import { execSync } from "node:child_process";
import path from "node:path";
import type { NextConfig } from "next";

// A stable identifier for this build, baked into the client bundle AND returned
// by the /app-build-id route handler. A stale open tab compares the two and
// shows the "Update now" banner when they differ. Sourced from the APP_BUILD_ID
// build-arg (the deploy passes the git SHA), then a local git SHA, then "dev".
function resolveAppBuildId(): string {
  const fromEnv = process.env.APP_BUILD_ID;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim().slice(0, 16);
  }
  try {
    const sha = execSync("git rev-parse --short=12 HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (sha.length > 0) {
      return sha;
    }
  } catch {
    // git is unavailable (e.g. the Docker frontend-builder layer has no .git);
    // the APP_BUILD_ID build-arg covers that path, so fall through to "dev".
  }
  return "dev";
}

const APP_BUILD_ID = resolveAppBuildId();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: APP_BUILD_ID,
  },
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
      // The Annix Rep app was rebranded to Annix Pulse; its canonical routes
      // moved to /annix-pulse/*. The page files still live under app/annix-rep
      // (served via the rewrite below), but every public URL is /annix-pulse so
      // old bookmarks, emailed links and installed PWAs keep working.
      {
        source: "/annix-rep",
        destination: "/annix-pulse",
        permanent: true,
      },
      {
        source: "/annix-rep/:path*",
        destination: "/annix-pulse/:path*",
        permanent: true,
      },
      // Voice Filter became a module of Annix Pulse; its standalone routes were
      // removed. Redirect old /voice-filter* URLs (including the former login
      // and calendar pages) to the Pulse module so bookmarks keep working.
      {
        source: "/voice-filter",
        destination: "/annix-pulse/voice-filter",
        permanent: true,
      },
      {
        source: "/voice-filter/:path*",
        destination: "/annix-pulse/voice-filter",
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
      // Annix Pulse: serve the existing app/annix-rep page tree under the
      // canonical /annix-pulse URL without moving the directory. The redirect
      // above makes /annix-pulse canonical; this rewrite resolves it to the
      // real route files. Internal links point at /annix-pulse directly.
      {
        source: "/annix-pulse",
        destination: "/annix-rep",
      },
      {
        source: "/annix-pulse/:path*",
        destination: "/annix-rep/:path*",
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
