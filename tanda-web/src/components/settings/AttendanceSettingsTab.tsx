'use client';

import { Coffee, Timer } from 'lucide-react';
import type { CompanySettings } from '@/lib/types/company-settings';

interface AttendanceSettingsTabProps {
  draft: CompanySettings;
  saving: boolean;
  onChange: (next: CompanySettings) => void;
  onSave: () => void;
}

export function AttendanceSettingsTab({
  draft,
  saving,
  onChange,
  onSave,
}: AttendanceSettingsTabProps) {
  const { attendanceBreak } = draft;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2.5">
          <Coffee className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Unpaid breaks</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Deduct a configured break from billable hours on shifts that meet the minimum
            duration.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <button
          type="button"
          role="switch"
          aria-checked={attendanceBreak.enabled}
          onClick={() =>
            onChange({
              ...draft,
              attendanceBreak: {
                ...attendanceBreak,
                enabled: !attendanceBreak.enabled,
              },
            })
          }
          className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition ${
            attendanceBreak.enabled
              ? 'border-primary/40 bg-primary/10'
              : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-white">Auto-deduct unpaid break</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Applied to completed check-in / check-out sessions
            </p>
          </div>
          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              attendanceBreak.enabled ? 'bg-primary' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                attendanceBreak.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </span>
        </button>

        <div
          className={`grid gap-4 sm:grid-cols-2 transition ${
            attendanceBreak.enabled ? 'opacity-100' : 'pointer-events-none opacity-40'
          }`}
        >
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-zinc-400">
              <Timer className="h-4 w-4" />
              <label htmlFor="break-duration" className="text-xs font-medium uppercase tracking-wide">
                Break duration
              </label>
            </div>
            <div className="flex items-baseline gap-2">
              <input
                id="break-duration"
                type="number"
                min={1}
                step={1}
                disabled={!attendanceBreak.enabled}
                value={attendanceBreak.durationMinutes}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    attendanceBreak: {
                      ...attendanceBreak,
                      durationMinutes: Number(e.target.value) || 30,
                    },
                  })
                }
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-primary/50"
              />
              <span className="text-sm text-zinc-500">minutes</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-zinc-400">
              <Timer className="h-4 w-4" />
              <label htmlFor="break-min-hours" className="text-xs font-medium uppercase tracking-wide">
                Minimum shift
              </label>
            </div>
            <div className="flex items-baseline gap-2">
              <input
                id="break-min-hours"
                type="number"
                min={1}
                step={0.5}
                disabled={!attendanceBreak.enabled}
                value={attendanceBreak.minShiftHours}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    attendanceBreak: {
                      ...attendanceBreak,
                      minShiftHours: Number(e.target.value) || 6,
                    },
                  })
                }
                className="w-20 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-primary/50"
              />
              <span className="text-sm text-zinc-500">hours or more</span>
            </div>
          </div>
        </div>

        <p className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-500">
          When editing a check-out, admins can mark that the employee did not take a break
          so the deduction is skipped for that session.
        </p>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save attendance rules'}
      </button>
    </section>
  );
}
