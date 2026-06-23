'use client';

import { CURRENCY_OPTIONS, TIMEZONE_OPTIONS } from '@/lib/constants';
import type { CompanySettings } from '@/lib/types/company-settings';

interface LocalizationTabProps {
  draft: CompanySettings;
  saving: boolean;
  onChange: (next: CompanySettings) => void;
  onSave: () => void;
}

export function LocalizationTab({
  draft,
  saving,
  onChange,
  onSave,
}: LocalizationTabProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
      <h2 className="text-sm font-semibold text-white">Localization</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Regional defaults for schedules, reports, and kiosk clock display.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor="timezone" className="mb-1.5 block text-sm text-zinc-400">
            Time zone
          </label>
          <select
            id="timezone"
            value={draft.timeZone}
            onChange={(e) => onChange({ ...draft, timeZone: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-primary/50"
          >
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="currency" className="mb-1.5 block text-sm text-zinc-400">
            Currency
          </label>
          <select
            id="currency"
            value={draft.currency}
            onChange={(e) => onChange({ ...draft, currency: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-primary/50"
          >
            {CURRENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save localization'}
        </button>
      </div>
    </section>
  );
}
