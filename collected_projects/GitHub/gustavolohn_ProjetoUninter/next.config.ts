import type { NextConfig } from "next"

const nextConfig: NextConfig = {}

export default nextConfig

const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: isProd ? '/ProjetoUninter' : '',
  assetPrefix: isProd ? '/ProjetoUninter/' : '',
};

module.exports = nextConfig;