import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand/tokens';
import { buildPwaIconEntries } from '@/lib/pwa/manifest-icons';

export function getWorkforceManifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Continental Cargo Workspace',
    short_name: 'CC Workspace',
    description: 'Employee schedule, attendance, and leave management.',
    start_url: '/employee-dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: BRAND.graphite,
    theme_color: BRAND.graphite,
    lang: 'en',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    prefer_related_applications: false,
    icons: buildPwaIconEntries(),
  };
}
