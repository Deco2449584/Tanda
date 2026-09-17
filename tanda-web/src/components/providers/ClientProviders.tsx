'use client';

import type { ReactNode } from 'react';
import { ProfileUploadStatusToaster } from '@/components/employees/ProfileUploadStatusToaster';
import { PwaInstallPrompt } from '@/components/pwa/PwaInstallPrompt';
import { CompanySettingsProvider } from '@/providers/CompanySettingsProvider';
import { AuthProvider } from '@/providers/AuthProvider';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CompanySettingsProvider>
        {children}
        <ProfileUploadStatusToaster />
        <PwaInstallPrompt />
      </CompanySettingsProvider>
    </AuthProvider>
  );
}
