import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tokens live in the URL path, so keep them out of Referer headers and caches.
  async headers() {
    return ["/delivery/:token", "/mls/:token", "/showcase/:token"].map((source) => ({
      source,
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "private, no-store" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    }));
  },
};

export default nextConfig;
