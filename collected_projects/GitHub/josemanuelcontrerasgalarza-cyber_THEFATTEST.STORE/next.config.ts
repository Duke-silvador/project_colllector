import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Unsplash's CDN resizes/compresses on the fly, so we use a custom loader
    // instead of proxying every image through the Next.js server.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  poweredByHeader: false,
};

export default nextConfig;
