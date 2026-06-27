'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchCompanySettings,
  saveCompanySettings as persistCompanySettings,
} from '@/lib/settings/company-settings-service';
import { saveCompanySettingsViaApi } from '@/lib/settings/settings-api';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/lib/types/company-settings';

interface CompanySettingsContextValue {
  settings: CompanySettings;
  loading: boolean;
  saving: boolean;
  refresh: () => Promise<void>;
  saveSettings: (next: CompanySettings) => Promise<void>;
}

const CompanySettingsContext = createContext<CompanySettingsContextValue | null>(
  null,
);

export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applySettings = useCallback((next: CompanySettings) => {
    setSettings(next);
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchCompanySettings();
    applySettings(data);
  }, [applySettings]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    void refresh()
      .catch((error) => {
        console.error('CompanySettingsProvider', error);
        if (!cancelled) {
          applySettings(DEFAULT_COMPANY_SETTINGS);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applySettings, refresh]);

  const saveSettings = useCallback(
    async (next: CompanySettings) => {
      setSaving(true);
      try {
        try {
          await saveCompanySettingsViaApi(next);
        } catch {
          await persistCompanySettings(next);
        }
        applySettings(next);
      } finally {
        setSaving(false);
      }
    },
    [applySettings],
  );

  const value = useMemo(
    () => ({
      settings,
      loading,
      saving,
      refresh,
      saveSettings,
    }),
    [settings, loading, saving, refresh, saveSettings],
  );

  return (
    <CompanySettingsContext.Provider value={value}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

export function useCompanySettings(): CompanySettingsContextValue {
  const context = useContext(CompanySettingsContext);
  if (!context) {
    throw new Error('useCompanySettings must be used within CompanySettingsProvider');
  }
  return context;
}
