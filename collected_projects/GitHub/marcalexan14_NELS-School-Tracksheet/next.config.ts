import type { NextConfig } from "next";

const securityHeaders = [
  // Force HTTPS for a year, including subdomains.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // This app has no reason to be framed by another site.
  { key: "X-Frame-Options", value: "DENY" },
  // Stop the browser guessing content types (e.g. an uploaded .xlsx as HTML).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (which can carry query params) to third-party links.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No camera/mic/geolocation/etc. — this app never needs them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["xlsx"],
  experimental: {
    serverActions: {
      // Default 1MB is too small for scanned documents attached to a student.
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
