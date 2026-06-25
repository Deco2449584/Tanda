import type { MetadataRoute } from 'next';

export function buildPwaIconEntries(): MetadataRoute.Manifest['icons'] {
  return [
    {
      src: '/pwa-icon?size=192',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-icon?size=512',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/pwa-icon?size=192&maskable=1',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/pwa-icon?size=512&maskable=1',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/apple-icon',
      sizes: '180x180',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icon',
      sizes: '32x32',
      type: 'image/png',
      purpose: 'any',
    },
  ];
}
