import type { Metadata, Viewport } from 'next';
import { KioskShell } from '@/components/kiosk/KioskShell';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import { kioskPwaMetadata } from '@/lib/pwa/kiosk-metadata';

export const metadata: Metadata = {
  title: `Kiosk | ${COMPANY_NAME}`,
  description: 'Employee check-in kiosk for tablets and shared devices.',
  applicationName: `${COMPANY_NAME} Kiosk`,
  ...kioskPwaMetadata,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <KioskShell>{children}</KioskShell>;
}
