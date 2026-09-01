import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  ...(isDevelopment
    ? {
        async rewrites() {
          const target =
            process.env.NEXT_PUBLIC_API_TARGET || "http://127.0.0.1:25774";
          return [
            {
              source: "/api/:path*",
              destination: `${target}/api/:path*`,
            },
            {
              source: "/themes/:path*",
              destination: `${target}/themes/:path*`,
            },
            {
              source: "/instance/:uuid",
              destination: "/",
            },
          ];
        },
      }
    : { output: "export" }),
};

export default nextConfig;
