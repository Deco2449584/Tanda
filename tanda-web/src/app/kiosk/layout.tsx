import type { Metadata, Viewport } from 'next';
import { KioskShell } from '@/components/kiosk/KioskShell';
import { BRAND } from '@/lib/brand/tokens';
import { COMPANY_NAME } from '@/lib/types/company-settings';
export const metadata: Metadata = {
  title: `Kiosk | ${COMPANY_NAME}`,
  description: 'Employee check-in kiosk for tablets and shared devices.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: BRAND.graphite,};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <KioskShell>{children}</KioskShell>;
}
