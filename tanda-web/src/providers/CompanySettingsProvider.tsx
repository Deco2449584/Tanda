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
import { doc, onSnapshot } from 'firebase/firestore';
import {
  fetchCompanySettings,
  saveCompanySettings as persistCompanySettings,
} from '@/lib/settings/company-settings-service';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
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

const SETTINGS_DOC_ID = 'general';

function mapSnapshotData(data: Record<string, unknown>): CompanySettings {
  return {
    timeZone:
      typeof data.timeZone === 'string'
        ? data.timeZone
        : DEFAULT_COMPANY_SETTINGS.timeZone,
    currency:
      typeof data.currency === 'string'
        ? data.currency
        : DEFAULT_COMPANY_SETTINGS.currency,
  };
}

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
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID),
      (snapshot) => {
        if (!snapshot.exists()) {
          applySettings(DEFAULT_COMPANY_SETTINGS);
        } else {
          applySettings(
            mapSnapshotData(snapshot.data() as Record<string, unknown>),
          );
        }
        setLoading(false);
      },
      () => {
        applySettings(DEFAULT_COMPANY_SETTINGS);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [applySettings]);

  const saveSettings = useCallback(
    async (next: CompanySettings) => {
      setSaving(true);
      try {
        await persistCompanySettings(next);
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
