import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  transpilePackages: [
    "@annix/product-data",
    "@annix/feedback-sdk",
    "@annix/feedback-web",
  ],

  async redirects() {
    return [];
  },

  async headers() {
    // An immutable, year-long cache is only safe for production builds, whose
    // /_next/static filenames are content-hashed. Turbopack dev chunks reuse
    // stable names, so an immutable header would pin stale code in the browser
    // across every edit — apply this rule in production only.
    const productionStaticCaching =
      process.env.NODE_ENV === "production"
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
              ],
            },
          ]
        : [];
    return [
      ...productionStaticCaching,
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
