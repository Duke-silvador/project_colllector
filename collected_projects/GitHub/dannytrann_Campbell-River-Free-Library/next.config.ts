import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  experimental: {
    serverActions: {
      // Photo uploads go through a Server Action (re-encoded with sharp).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
