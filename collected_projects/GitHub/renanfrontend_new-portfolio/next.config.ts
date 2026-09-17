import type { NextConfig } from 'next';

/**
 * `npm run export` gera um bundle 100% estático (Netlify, S3, GitHub Pages).
 * `npm run build` mantém o runtime Node/Edge da Vercel.
 * O flag existe para que o mesmo código-fonte atenda os dois destinos sem fork.
 */
const isStaticExport = process.env.NEXT_OUTPUT === 'export';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  ...(isStaticExport ? { output: 'export' as const } : {}),

  images: {
    formats: ['image/avif', 'image/webp'],
    unoptimized: isStaticExport,
  },

  experimental: {
    optimizePackageImports: ['clsx', 'tailwind-merge'],
  },

  // `headers()` não é suportado em export estático — o host cuida disso lá.
  ...(isStaticExport
    ? {}
    : {
        async headers() {
          return [{ source: '/:path*', headers: [...securityHeaders] }];
        },
      }),
};

export default nextConfig;
