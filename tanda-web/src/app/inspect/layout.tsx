import type { Metadata, Viewport } from 'next';
import { InspectShell } from '@/components/inspect/InspectShell';
import { BRAND } from '@/lib/brand/tokens';
import { INSPECT_BRAND } from '@/lib/inspect/brand';

export const metadata: Metadata = {
  title: `${INSPECT_BRAND.appName} | ${INSPECT_BRAND.company}`,
  description:
    'Register cargo intakes, capture evidence, and dispatch units from the warehouse floor.',
  manifest: '/inspect/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: INSPECT_BRAND.appName,
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
