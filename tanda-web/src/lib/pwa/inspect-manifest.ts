import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand/tokens';
import { INSPECT_BRAND } from '@/lib/inspect/brand';
import { buildPwaIconEntries } from '@/lib/pwa/manifest-icons';

/**
 * Scoped to /inspect so warehouse staff can install the intake app on its own,
 * separate from the workforce workspace manifest (/manifest.webmanifest).
 */
export function getInspectManifest(): MetadataRoute.Manifest {
  return {
    id: '/inspect',
    name: `${INSPECT_BRAND.appName} — ${INSPECT_BRAND.company}`,
    short_name: INSPECT_BRAND.appName,
    description:
      'Register cargo intakes, capture photo and video evidence, and dispatch units.',
    start_url: '/inspect',
    scope: '/inspect',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BRAND.graphite,
    theme_color: BRAND.graphite,
    categories: ['business', 'productivity'],
    icons: buildPwaIconEntries(),
    shortcuts: [
      {
        name: 'New inspection',
        short_name: 'New',
        url: '/inspect/new',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Advanced search',
        short_name: 'Search',
        url: '/inspect/search',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
