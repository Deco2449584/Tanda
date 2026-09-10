import type { Metadata } from 'next';

export const WORKFORCE_MANIFEST_HREF = '/manifest.webmanifest';

/** Single-app PWA metadata, applied at the root layout so every route shares one manifest. */
export const workforcePwaMetadata: Metadata = {
  manifest: WORKFORCE_MANIFEST_HREF,
  appleWebApp: {
    capable: true,
    title: 'Continental Cargo Workspace',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
};
