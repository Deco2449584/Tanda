import type { MetadataRoute } from 'next';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import { buildPwaIconEntries } from '@/lib/pwa/manifest-icons';

export function getKioskManifest(): MetadataRoute.Manifest {
  return {
    id: '/kiosk/',
    name: `${COMPANY_NAME} Kiosk`,
    short_name: 'Kiosk',
    description: 'Shared tablet check-in for employee attendance.',
    start_url: '/kiosk/',
    scope: '/kiosk/',
    display: 'standalone',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'any',
    background_color: '#09090b',
    theme_color: '#09090b',
    prefer_related_applications: false,
    icons: buildPwaIconEntries('/kiosk'),
  };
}
