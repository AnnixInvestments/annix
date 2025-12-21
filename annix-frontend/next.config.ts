import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for production builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

export default nextConfig;
