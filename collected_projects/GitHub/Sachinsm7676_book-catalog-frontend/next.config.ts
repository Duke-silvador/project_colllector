import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The catalog is the home screen; keep "/" working for the demo link.
  async redirects() {
    return [{ source: "/", destination: "/books/list", permanent: false }];
  },
};

export default nextConfig;
