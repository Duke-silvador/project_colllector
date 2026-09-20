import type { NextConfig } from "next";

// Set by the GitHub Pages Actions workflow only — local dev and a normal
// server deploy (Vercel etc.) are unaffected and keep the API route + proxy.
const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";
const repoName = "4ai-eu";

const nextConfig: NextConfig = isGithubPagesBuild
  ? {
      output: "export",
      basePath: `/${repoName}`,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
