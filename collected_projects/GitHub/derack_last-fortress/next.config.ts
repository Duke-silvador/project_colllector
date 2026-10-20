import type { NextConfig } from "next";

// CAP_BUILD=1 → خروجی استاتیک برای WebView اندروید (Capacitor)
// بقیه حالت‌ها — استندالون معمولی وب
const isCap = process.env.CAP_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isCap
    ? { output: "export" as const, trailingSlash: true }
    : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
