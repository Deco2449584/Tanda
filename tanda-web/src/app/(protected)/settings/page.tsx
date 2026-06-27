'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminProfileTab } from '@/components/settings/AdminProfileTab';
import { AttendanceSettingsTab } from '@/components/settings/AttendanceSettingsTab';
import { DataPurgeTab } from '@/components/settings/DataPurgeTab';
import { LocalizationTab } from '@/components/settings/LocalizationTab';
import { LocationsTab } from '@/components/settings/LocationsTab';
import { LocationGroupsTab } from '@/components/settings/LocationGroupsTab';
import { KioskDevicesTab } from '@/components/settings/KioskDevicesTab';
import { NotificationsSettingsTab } from '@/components/settings/NotificationsSettingsTab';
import { PortalClientsTab } from '@/components/settings/PortalClientsTab';
import { LoadingIndicator } from '@/components/ui/LoadingSplash';
import { PageContent } from '@/components/ui/PageContent';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { useAdminAccess } from '@/hooks/useAdminAccess';
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
  | 'notifications'
  | 'data'
  | 'portal'
  | 'locations'
  | 'locationGroups'
  | 'kioskDevices';

const ADMIN_TABS: { id: SettingsTab; label: string }[] = [
  { id: 'localization', label: 'Localization' },
  { id: 'attendance', label: 'Time & attendance' },
  { id: 'notifications', label: 'Notifications' },
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
  const { user, loading: authLoading } = useAuthRole();
  const { isMaster, canAccessModule, canEditModule } = useAdminAccess();
  const canManageSettings = canAccessModule('settings');
  const canEditSettings = canEditModule('settings');

  const tabs = useMemo(
    () =>
      ADMIN_TABS.filter((tab) => {
        if (tab.id === 'data') return isMaster;
        if (tab.id === 'profile' || tab.id === 'localization' || tab.id === 'notifications') {
          return true;
        }
        return canManageSettings;
      }),
    [canManageSettings, isMaster],
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

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id ?? 'profile');
    }
  }, [activeTab, tabs]);

  const showToast = useCallback(
    (text: string, variant: ToastMessage['variant'] = 'success') => {
      setToast({ id: crypto.randomUUID(), text, variant });
    },
    [],
  );

  async function handleSaveSettings(next: CompanySettings) {
    if (!canEditSettings) return;

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
  const settingsSaving = saving && canEditSettings;

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
        <LoadingIndicator message="Loading settings…" className="h-96" />
      ) : (
        <div className="max-w-2xl">
          {activeTab === 'localization' && (
            <LocalizationTab
              draft={draft}
              saving={settingsSaving}
              onChange={setDraft}
              onSave={
                canEditSettings ? () => void handleSaveSettings(draft) : undefined
              }
            />
          )}
          {activeTab === 'attendance' && canManageSettings && (
            <AttendanceSettingsTab
              draft={draft}
              saving={settingsSaving}
              onChange={setDraft}
              onSave={
                canEditSettings ? () => void handleSaveSettings(draft) : undefined
              }
            />
          )}
          {activeTab === 'notifications' && <NotificationsSettingsTab />}
          {activeTab === 'profile' && (
            <AdminProfileTab
              name={adminName}
              email={user?.email ?? ''}
              loading={authLoading}
              onNameChange={setAdminName}
            />
          )}
          {activeTab === 'data' && isMaster && (
            <DataPurgeTab adminEmail={user?.email ?? ''} />
          )}
          {activeTab === 'locations' && canManageSettings && (
            <LocationsTab onToast={showToast} />
          )}
          {activeTab === 'locationGroups' && canManageSettings && (
            <LocationGroupsTab onToast={showToast} />
          )}
          {activeTab === 'kioskDevices' && canManageSettings && (
            <KioskDevicesTab onToast={showToast} />
          )}
          {activeTab === 'portal' && canManageSettings && (
            <PortalClientsTab onToast={showToast} />
          )}
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </PageContent>
  );
}
