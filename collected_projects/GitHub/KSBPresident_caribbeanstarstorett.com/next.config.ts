import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/terms",
        destination: "/help#terms",
        permanent: false,
      },
      {
        source: "/privacy-policy",
        destination: "/privacy",
        permanent: false,
      },
      {
        source: "/account",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
