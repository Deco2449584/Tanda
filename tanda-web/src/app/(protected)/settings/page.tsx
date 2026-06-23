'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminProfileTab } from '@/components/settings/AdminProfileTab';
import { AttendanceSettingsTab } from '@/components/settings/AttendanceSettingsTab';
import { DataPurgeTab } from '@/components/settings/DataPurgeTab';
import { LocalizationTab } from '@/components/settings/LocalizationTab';
import { LocationsTab } from '@/components/settings/LocationsTab';
import { LocationGroupsTab } from '@/components/settings/LocationGroupsTab';
import { KioskDevicesTab } from '@/components/settings/KioskDevicesTab';
import { PortalClientsTab } from '@/components/settings/PortalClientsTab';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAuthRole } from '@/hooks/useAuthRole';
import { useCompanySettings } from '@/providers/CompanySettingsProvider';
import {
  COMPANY_NAME,
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/lib/types/company-settings';

type SettingsTab =
  | 'localization'
  | 'attendance'
  | 'profile'
  | 'data'
  | 'portal'
  | 'locations'
  | 'locationGroups'
  | 'kioskDevices';

const ADMIN_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'localization', label: 'Localization' },
  { id: 'attendance', label: 'Time & attendance' },
  { id: 'profile', label: 'Administrator' },
  { id: 'locations', label: 'Locations' },
  { id: 'locationGroups', label: 'Location groups' },
  { id: 'kioskDevices', label: 'Kiosk devices' },
  { id: 'portal', label: 'Portal clients' },
  { id: 'data', label: 'Data cleanup' },
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
  const { user, loading: authLoading, role } = useAuthRole();
  const tabs =
    role === 'admin'
      ? ADMIN_TABS
      : ADMIN_TABS.filter(
          (tab) =>
            tab.id !== 'data' &&
            tab.id !== 'portal' &&
            tab.id !== 'locations' &&
            tab.id !== 'locationGroups' &&
            tab.id !== 'kioskDevices' &&
            tab.id !== 'attendance',
        );
  const { settings, loading: settingsLoading, saving, saveSettings } =
    useCompanySettings();

  const [activeTab, setActiveTab] = useState<SettingsTab>('localization');
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
    <PageContent className="relative min-h-full space-y-6">
      <PageHeader
        title="System settings"
        description={`Regional configuration for ${COMPANY_NAME}`}
      />

      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {pageLoading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-surface-raised" />
      ) : (
        <div className="max-w-2xl">
          {activeTab === 'localization' && (
            <LocalizationTab
              draft={draft}
              saving={saving}
              onChange={setDraft}
              onSave={() => void handleSaveSettings(draft)}
            />
          )}
          {activeTab === 'attendance' && role === 'admin' && (
            <AttendanceSettingsTab
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
          {activeTab === 'data' && role === 'admin' && (
            <DataPurgeTab adminEmail={user?.email ?? ''} />
          )}
          {activeTab === 'locations' && role === 'admin' && (
            <LocationsTab onToast={showToast} />
          )}
          {activeTab === 'locationGroups' && role === 'admin' && (
            <LocationGroupsTab onToast={showToast} />
          )}
          {activeTab === 'kioskDevices' && role === 'admin' && (
            <KioskDevicesTab onToast={showToast} />
          )}
          {activeTab === 'portal' && role === 'admin' && (
            <PortalClientsTab onToast={showToast} />
          )}
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
