'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminProfileTab } from '@/components/settings/AdminProfileTab';
import { IdentityBrandingTab } from '@/components/settings/IdentityBrandingTab';
import { LocalizationTab } from '@/components/settings/LocalizationTab';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/lib/types/company-settings';

type SettingsTab = 'branding' | 'localization' | 'profile';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'branding', label: 'Identity & Branding' },
  { id: 'localization', label: 'Localization' },
  { id: 'profile', label: 'Administrator' },
];

function deriveDisplayName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (displayName?.trim()) return displayName.trim();
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
  const { settings, loading: settingsLoading, saving, saveSettings, uploadLogo } =
    useCompanySettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [draft, setDraft] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [adminName, setAdminName] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!user) return;
    setAdminName(deriveDisplayName(user.displayName, user.email));
  }, [user?.displayName, user?.email, user]);

  const showToast = useCallback(
    (text: string, variant: ToastMessage['variant'] = 'success') => {
      setToast({ id: crypto.randomUUID(), text, variant });
    },
    [],
  );

  async function handleUploadLogo(file: File) {
    showToast('Uploading logo…', 'info');
    try {
      const logoUrl = await uploadLogo(file);
      const next = { ...draft, logoUrl };
      setDraft(next);
      await saveSettings(next);
      showToast('Logo uploaded and saved.');
    } catch {
      showToast('Could not upload logo.', 'error');
    }
  }

  async function handleSaveSettings(next: CompanySettings) {
    showToast('Saving settings…', 'info');
    try {
      await saveSettings(next);
      setDraft(next);
      showToast('Settings saved successfully.');
    } catch {
      showToast('Could not save settings.', 'error');
    }
  }

  const pageLoading = authLoading || settingsLoading;

  return (
    <div className="relative min-h-full space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-sm font-bold tracking-wide text-white uppercase md:text-base">
          System settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          White-label configuration for {settings.companyName}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pageLoading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-zinc-900/60" />
      ) : (
        <div className="max-w-2xl">
          {activeTab === 'branding' && (
            <IdentityBrandingTab
              draft={draft}
              saving={saving}
              onChange={setDraft}
              onUploadLogo={handleUploadLogo}
              onSave={() => void handleSaveSettings(draft)}
            />
          )}
          {activeTab === 'localization' && (
            <LocalizationTab
              draft={draft}
              saving={saving}
              onChange={setDraft}
              onSave={() => void handleSaveSettings(draft)}
            />
          )}
          {activeTab === 'profile' && (
            <AdminProfileTab
              name={adminName}
              email={user?.email ?? ''}
              loading={authLoading}
              onNameChange={setAdminName}
            />
          )}
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
