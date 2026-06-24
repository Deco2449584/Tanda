import type { Metadata } from 'next';

export const WORKFORCE_MANIFEST_HREF = '/manifest.webmanifest';

/** PWA metadata for the workforce app — do not add to root or kiosk layouts. */
export const workforcePwaMetadata: Metadata = {
  manifest: WORKFORCE_MANIFEST_HREF,
  appleWebApp: {
    capable: true,
    title: 'Continental Cargo',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/apple-icon', type: 'image/png' }],
  },
};
