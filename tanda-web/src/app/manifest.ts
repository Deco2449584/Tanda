import type { MetadataRoute } from 'next';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${COMPANY_NAME} | TimeTracker PRO`,
    short_name: 'TimeTracker',
    description: 'Employee schedule, attendance, and leave management.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#001A3F',
    icons: [
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
