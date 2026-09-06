import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand/tokens';
import { buildPwaIconEntries } from '@/lib/pwa/manifest-icons';

export function getWorkforceManifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Time Tracker Pro',
    short_name: 'Time Tracker Pro',
    description: 'Employee schedule, attendance, and leave management.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BRAND.graphite,
    theme_color: BRAND.graphite,
    icons: buildPwaIconEntries(),
  };
}
