import type { Metadata, Viewport } from 'next';
import { BRAND } from '@/lib/brand/tokens';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export const metadata: Metadata = {
  title: `Scan punch | ${COMPANY_NAME}`,
  description: 'Clock in or out by scanning a site QR or NFC tag.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND.graphite,
};

export default function PunchScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-surface-base text-foreground">{children}</div>
  );
}
