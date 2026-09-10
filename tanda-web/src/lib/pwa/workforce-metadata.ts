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
    // Dark tile for browser tabs / search snippets.
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    // White tile for home screen / Apple touch (same as PWA).
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
};
