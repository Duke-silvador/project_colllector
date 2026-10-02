import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.wallzy.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "wallzy.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.tiktokcdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.tiktokcdn-us.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.tiktokcdn-eu.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.byteimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.ibyteimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.pstatp.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/contact", destination: "/contact.html" },
      { source: "/privacy", destination: "/privacy.html" },
      { source: "/terms", destination: "/terms.html" },
    ];
  },
  // Wallzy targets Next.js's supported modern browsers. The built-in
  // polyfill-module is otherwise bundled unconditionally and Lighthouse
  // flags its legacy APIs (Array.at/flat/flatMap, Object.hasOwn/fromEntries,
  // trimStart/trimEnd). Keep the module empty for modern clients.
  turbopack: {
    resolveAlias: {
      "../build/polyfills/polyfill-module": "./lib/modern-polyfill.js",
      "next/dist/build/polyfills/polyfill-module": "./lib/modern-polyfill.js",
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "../build/polyfills/polyfill-module": false,
      "next/dist/build/polyfills/polyfill-module": false,
    };
    return config;
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
