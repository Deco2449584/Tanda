import { PortalShell } from '@/components/portal/PortalShell';

export default function PortalTrackLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PortalShell>{children}</PortalShell>;
}
