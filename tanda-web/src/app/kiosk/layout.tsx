import type { Metadata } from 'next';
import { KioskShell } from '@/components/kiosk/KioskShell';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export const metadata: Metadata = {
  title: `Kiosk | ${COMPANY_NAME}`,
  description: 'Employee check-in kiosk for tablets and shared devices.',
  applicationName: `${COMPANY_NAME} Kiosk`,
  manifest: '/kiosk/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Kiosk',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [{ url: '/kiosk/icon', type: 'image/png' }],
    apple: [{ url: '/kiosk/apple-icon', type: 'image/png' }],
  },
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <KioskShell>{children}</KioskShell>;
}
