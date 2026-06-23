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
    <div className="space-y-6">
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
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
        <h2 className="text-sm font-semibold text-white">Attendance breaks</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Unpaid break deducted from billable hours when a shift meets the minimum duration.
        </p>

        <div className="mt-6 space-y-4">
          <label className="flex items-start gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={draft.attendanceBreak.enabled}
              onChange={(e) =>
                onChange({
                  ...draft,
                  attendanceBreak: {
                    ...draft.attendanceBreak,
                    enabled: e.target.checked,
                  },
                })
              }
              className="mt-1"
            />
            <span>Automatically deduct unpaid break from completed shifts</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="break-duration"
                className="mb-1.5 block text-sm text-zinc-400"
              >
                Break duration (minutes)
              </label>
              <input
                id="break-duration"
                type="number"
                min={1}
                step={1}
                disabled={!draft.attendanceBreak.enabled}
                value={draft.attendanceBreak.durationMinutes}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    attendanceBreak: {
                      ...draft.attendanceBreak,
                      durationMinutes: Number(e.target.value) || 30,
                    },
                  })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-primary/50 disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="break-min-hours"
                className="mb-1.5 block text-sm text-zinc-400"
              >
                Minimum shift hours
              </label>
              <input
                id="break-min-hours"
                type="number"
                min={1}
                step={0.5}
                disabled={!draft.attendanceBreak.enabled}
                value={draft.attendanceBreak.minShiftHours}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    attendanceBreak: {
                      ...draft.attendanceBreak,
                      minShiftHours: Number(e.target.value) || 6,
                    },
                  })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-primary/50 disabled:opacity-50"
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Admins can waive the break per check-out when editing a record if the employee
            did not take a break.
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  );
}
