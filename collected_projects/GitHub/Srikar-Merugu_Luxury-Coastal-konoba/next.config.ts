import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run beside `next dev` without clobbering its cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // CSS goes inline in the HTML, so no stylesheet request blocks the first paint.
  experimental: { inlineCss: true },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920, 2400],
  },
  async headers() {
    return [
      {
        source: "/video/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
