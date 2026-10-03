import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No Next.js badge in the corner. This is a storefront, not a demo.
  devIndicators: false,
  // A stray package-lock.json in the home directory otherwise makes Next pick
  // the wrong tracing root, which bloats the deployment bundle.
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com" }],
  },
  // three.js ships untranspiled ESM examples; Next handles them via transpilePackages.
  transpilePackages: ["three"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
