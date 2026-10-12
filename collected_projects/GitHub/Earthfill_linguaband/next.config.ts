import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  /* config options here */
};

// Enables Cloudflare bindings (D1, R2, env vars) during `next dev`.
initOpenNextCloudflareForDev();

export default nextConfig;
