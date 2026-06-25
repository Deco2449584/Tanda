import type { NextConfig } from 'next';

function firebaseStorageRemotePatterns() {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    {
      protocol: 'https',
      hostname: 'firebasestorage.googleapis.com',
      pathname: '/**',
    },
  ];

  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (bucket?.endsWith('.firebasestorage.app')) {
    patterns.push({
      protocol: 'https',
      hostname: bucket,
      pathname: '/**',
    });
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [32, 48, 64, 96, 128, 256, 384],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: firebaseStorageRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
