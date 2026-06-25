import type { MetadataRoute } from 'next';
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
    background_color: '#001A3F',
    theme_color: '#001A3F',
    icons: buildPwaIconEntries(),
  };
}
