import type { Metadata } from 'next';

export const WORKFORCE_MANIFEST_HREF = '/manifest.webmanifest';

/** Single-app PWA metadata, applied at the root layout so every route shares one manifest. */
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
