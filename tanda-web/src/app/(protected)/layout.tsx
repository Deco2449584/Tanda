import type { Metadata } from 'next';
import { ProtectedShell } from '@/components/layout/ProtectedShell';
import { workforcePwaMetadata } from '@/lib/pwa/workforce-metadata';

export const metadata: Metadata = workforcePwaMetadata;

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProtectedShell>{children}</ProtectedShell>;
}
