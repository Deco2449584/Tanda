import type { Metadata } from 'next';
import { COMPANY_NAME } from '@/lib/types/company-settings';

export const metadata: Metadata = {
  title: `Client Portal | ${COMPANY_NAME}`,
  description: 'Track your cargo inspection status with AWB and company PIN.',
};

export default function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
