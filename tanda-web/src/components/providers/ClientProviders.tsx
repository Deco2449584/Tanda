'use client';

import type { ReactNode } from 'react';
import { CompanySettingsProvider } from '@/providers/CompanySettingsProvider';

export function ClientProviders({ children }: { children: ReactNode }) {
  return <CompanySettingsProvider>{children}</CompanySettingsProvider>;
}
