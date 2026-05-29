import { AuthProvider } from '@/providers/AuthProvider';
import { ProtectedShell } from '@/components/layout/ProtectedShell';

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <ProtectedShell>{children}</ProtectedShell>
    </AuthProvider>
  );
}
