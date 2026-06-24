import type { Metadata } from 'next';

export const KIOSK_MANIFEST_HREF = '/kiosk/manifest.webmanifest';

/** PWA metadata for the kiosk app only. */
export const kioskPwaMetadata: Metadata = {
  manifest: KIOSK_MANIFEST_HREF,
  appleWebApp: {
    capable: true,
    title: 'Kiosk',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/kiosk/icon', type: 'image/png' }],
    apple: [{ url: '/kiosk/apple-icon', type: 'image/png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};
