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
  uploadCompanyLogo,
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
  uploadLogo: (file: File) => Promise<string>;
}

const CompanySettingsContext = createContext<CompanySettingsContextValue | null>(
  null,
);

const SETTINGS_DOC_ID = 'general';

function normalizeHexColor(hex: string, fallback: string): string {
  const trimmed = hex.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const h = trimmed.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed}`;
  return fallback;
}

function applyThemeToDocument(settings: CompanySettings): void {
  if (typeof document === 'undefined') return;

  const brandPrimary = normalizeHexColor(
    settings.primaryColor,
    DEFAULT_COMPANY_SETTINGS.primaryColor,
  );
  const brandSecondary = normalizeHexColor(
    settings.secondaryColor,
    DEFAULT_COMPANY_SETTINGS.secondaryColor,
  );

  document.documentElement.style.setProperty('--brand-primary', brandPrimary);
  document.documentElement.style.setProperty('--brand-secondary', brandSecondary);

  if (process.env.NODE_ENV === 'development') {
    console.log('[CompanySettings] theme colors injected:', {
      '--brand-primary': brandPrimary,
      '--brand-secondary': brandSecondary,
    });
  }
}

function mapSnapshotData(data: Record<string, unknown>): CompanySettings {
  return {
    companyName:
      typeof data.companyName === 'string'
        ? data.companyName
        : DEFAULT_COMPANY_SETTINGS.companyName,
    logoUrl:
      typeof data.logoUrl === 'string' ? data.logoUrl : DEFAULT_COMPANY_SETTINGS.logoUrl,
    primaryColor:
      typeof data.primaryColor === 'string'
        ? data.primaryColor
        : DEFAULT_COMPANY_SETTINGS.primaryColor,
    secondaryColor:
      typeof data.secondaryColor === 'string'
        ? data.secondaryColor
        : DEFAULT_COMPANY_SETTINGS.secondaryColor,
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
    applyThemeToDocument(next);
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchCompanySettings();
    applySettings(data);
  }, [applySettings]);

  useEffect(() => {
    applyThemeToDocument(DEFAULT_COMPANY_SETTINGS);

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

  const uploadLogo = useCallback(async (file: File) => {
    const url = await uploadCompanyLogo(file);
    return url;
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      saving,
      refresh,
      saveSettings,
      uploadLogo,
    }),
    [settings, loading, saving, refresh, saveSettings, uploadLogo],
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
