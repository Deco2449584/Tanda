'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminProfileCard } from '@/components/settings/AdminProfileCard';
import {
  CompanySettingsCard,
  type CompanySettings,
} from '@/components/settings/CompanySettingsCard';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAuthRole } from '@/hooks/useAuthRole';

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Continental Cargo',
  timezone: 'AEST - Sydney',
  checkInDeadline: '09:00 AM',
};

function deriveDisplayName(email: string | null | undefined): string {
  if (!email) return 'Administrator';
  const local = email.split('@')[0] ?? '';
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuthRole();
  const [adminName, setAdminName] = useState('');
  const [companySettings, setCompanySettings] =
    useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    setAdminName(deriveDisplayName(user.email));
  }, [user?.email]);

  const showToast = useCallback((text: string, variant: ToastMessage['variant'] = 'success') => {
    setToast({
      id: String(Date.now()),
      text,
      variant,
    });
  }, []);

  function handleChangePassword() {
    showToast(
      'Recovery link sent to your email',
      'info',
    );
  }

  async function handleSaveCompany() {
    setSaving(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setSaving(false);
    showToast('Changes saved successfully.');
  }

  return (
    <div className="relative min-h-full space-y-6 p-4 md:p-6">
      <h1 className="text-sm font-bold tracking-wide text-white uppercase md:text-base">
        System settings
      </h1>

      {authLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-900/60" />
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-900/60" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AdminProfileCard
            name={adminName}
            email={user?.email ?? ''}
            loading={authLoading}
            onNameChange={setAdminName}
            onChangePassword={handleChangePassword}
          />

          <CompanySettingsCard
            settings={companySettings}
            saving={saving}
            onChange={setCompanySettings}
            onSave={() => void handleSaveCompany()}
          />
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
