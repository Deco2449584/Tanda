'use client';

import type { ReactNode } from 'react';
import { ProfileUploadStatusToaster } from '@/components/employees/ProfileUploadStatusToaster';
import { AuthProvider } from '@/providers/AuthProvider';
import { CompanySettingsProvider } from '@/providers/CompanySettingsProvider';
import { CurrentEmployeeProvider } from '@/providers/CurrentEmployeeProvider';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CurrentEmployeeProvider>
        <CompanySettingsProvider>
          {children}
          <ProfileUploadStatusToaster />
        </CompanySettingsProvider>
      </CurrentEmployeeProvider>
    </AuthProvider>
  );
}
