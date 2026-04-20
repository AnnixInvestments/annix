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
    return [
      {
        source: "/stock-control/portal/:path*",
        destination: "/ops/portal/:path*",
        permanent: false,
      },
      {
        source: "/au-rubber/portal/:path*",
        destination: "/ops/portal/:path*",
        permanent: false,
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
