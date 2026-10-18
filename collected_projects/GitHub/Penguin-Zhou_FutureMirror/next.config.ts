import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 演示环境可能无网络：跳过构建期 lint，保证一键构建成功
  eslint: { ignoreDuringBuilds: true },
  // 静态演示页：/demo → public/futuremirror-demo.html（与 README「演示版即 /demo 页」对应）
  async rewrites() {
    return [{ source: "/demo", destination: "/futuremirror-demo.html" }];
  },
};

export default nextConfig;
