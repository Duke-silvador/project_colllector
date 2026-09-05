import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site is fully static: no server runtime is required for hosting.
  // Codex can deploy the `out/` directory to any static host.
  output: "export",
  images: {
    // `output: export` has no image optimization server.
    unoptimized: true,
  },
  reactStrictMode: true,
  // Trailing slashes keep static hosts (S3, Cloudflare Pages, GitHub Pages)
  // resolving nested routes consistently.
  trailingSlash: true,
};

export default nextConfig;
