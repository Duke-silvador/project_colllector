import { execSync } from "node:child_process";
import type { NextConfig } from "next";

function commit(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  if (process.env.GIT_COMMIT_SHA) return process.env.GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: commit(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  async headers() {
    return [
      {
        // No page may be framed (clickjacking, especially on /connect).
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        // The connect URL carries the sealed request; never leak it to linked sites.
        source: "/connect",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
  async rewrites() {
    // Next.js doesn't route dot-directories; rewrite the well-known paths
    // before the filesystem check (same approach as kx-tools).
    return {
      beforeFiles: [
        { source: "/.well-known/oauth-authorization-server", destination: "/api/oauth-metadata" },
        {
          source: "/.well-known/oauth-authorization-server/:path*",
          destination: "/api/oauth-metadata",
        },
        {
          source: "/.well-known/oauth-protected-resource",
          destination: "/api/oauth-resource-metadata",
        },
        {
          source: "/.well-known/oauth-protected-resource/:path*",
          destination: "/api/oauth-resource-metadata",
        },
      ],
    };
  },
};

export default nextConfig;
