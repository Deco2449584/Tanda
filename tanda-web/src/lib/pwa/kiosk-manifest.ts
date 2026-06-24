import type { MetadataRoute } from 'next';
import { buildPwaIconEntries } from '@/lib/pwa/manifest-icons';

export function getKioskManifest(): MetadataRoute.Manifest {
  return {
    id: '/kiosk',
    name: 'Kiosk Continental Cargo',
    short_name: 'Kiosk',
    description: 'Shared tablet check-in for employee attendance.',
    start_url: '/kiosk',
    scope: '/',
    display: 'fullscreen',
    orientation: 'any',
    background_color: '#09090b',
    theme_color: '#09090b',
    prefer_related_applications: false,
    icons: buildPwaIconEntries('/kiosk'),
  };
}
