'use client';

import type { ReactNode } from 'react';
import { CompanySettingsProvider } from '@/providers/CompanySettingsProvider';
import { AuthProvider } from '@/providers/AuthProvider';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CompanySettingsProvider>{children}</CompanySettingsProvider>
    </AuthProvider>
  );
}
