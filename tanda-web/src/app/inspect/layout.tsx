import type { Metadata, Viewport } from 'next';
import { InspectShell } from '@/components/inspect/InspectShell';
import { BRAND } from '@/lib/brand/tokens';
import { INSPECT_BRAND } from '@/lib/inspect/brand';

export const metadata: Metadata = {
  title: `${INSPECT_BRAND.appName} | ${INSPECT_BRAND.company}`,
  description:
    'Register cargo intakes, capture evidence, and dispatch units from the warehouse floor.',
  applicationName: INSPECT_BRAND.appName,
  // Overrides the root Workspace manifest so this tree installs as its own app.
  manifest: '/inspect/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: INSPECT_BRAND.appName,
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND.graphite,
  viewportFit: 'cover',
};

export default function InspectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InspectShell>{children}</InspectShell>;
}
