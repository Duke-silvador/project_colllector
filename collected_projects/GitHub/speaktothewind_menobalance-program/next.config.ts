import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: '/menobalance-program',
  images: { unoptimized: true },
};
export default nextConfig;
