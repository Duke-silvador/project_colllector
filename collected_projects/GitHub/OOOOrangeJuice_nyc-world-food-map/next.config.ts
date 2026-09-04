import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optional static export for Cloudflare Pages / any static host:
  // STATIC_EXPORT=true npm run build
  output: process.env.STATIC_EXPORT === "true" ? "export" : undefined,
};

export default nextConfig;
