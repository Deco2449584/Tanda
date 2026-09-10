import type { MetadataRoute } from 'next';

/**
 * PWA / home-screen icons: dark mark on white.
 * Browser tab favicons use `/icons/favicon-*.png` (dark tile) via metadata.
 */
export function buildPwaIconEntries(): MetadataRoute.Manifest['icons'] {
  return [
    {
      src: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-maskable-192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icons/icon-180.png',
      sizes: '180x180',
      type: 'image/png',
      purpose: 'any',
    },
  ];
}
