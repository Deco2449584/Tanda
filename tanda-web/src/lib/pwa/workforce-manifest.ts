import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand/tokens';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import { buildPwaIconEntries } from '@/lib/pwa/manifest-icons';

export function getWorkforceManifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${COMPANY_NAME} | TimeTracker PRO`,
    short_name: 'TimeTracker',
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
