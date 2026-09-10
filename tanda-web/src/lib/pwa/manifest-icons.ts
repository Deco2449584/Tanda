import type { MetadataRoute } from 'next';

/**
 * Prefer static white-background brand icons (same mark as continentalcargo.com.au)
 * so crawlers, install prompts, and home-screen icons stay consistent.
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
    {
      src: '/icons/icon-32.png',
      sizes: '32x32',
      type: 'image/png',
      purpose: 'any',
    },
  ];
}
