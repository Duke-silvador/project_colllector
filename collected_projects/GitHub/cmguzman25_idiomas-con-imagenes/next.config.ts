import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Scene images are delivered by Cloudinary. Narrow this to your own cloud
    // name if you ever want to be stricter than "any Cloudinary account".
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
