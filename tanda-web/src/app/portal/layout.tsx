import type { Metadata } from 'next';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export const metadata: Metadata = {
  title: `Client Portal | ${COMPANY_NAME}`,
  description:
    'Track cargo inspections with AWB and PIN, or sign in with your client account.',
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
