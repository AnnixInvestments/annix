import type { NextConfig } from "next";
import path from "node:path";
import TerserPlugin from "terser-webpack-plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, ".."),
  transpilePackages: [
    "@annix/product-data",
    "@tanstack/react-query",
    "@tanstack/query-core",
  ],

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
      "@tanstack/react-query",
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

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.minimizer = [
        new TerserPlugin({
          terserOptions: {
            compress: { passes: 2 },
            mangle: true,
            format: { comments: false },
          },
          extractComments: false,
        }),
      ];
    }
    return config;
  },
};

export default nextConfig;
