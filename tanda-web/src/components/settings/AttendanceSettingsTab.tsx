'use client';

import { Coffee, ShieldAlert, ShieldCheck, Timer } from 'lucide-react';
import type { CompanySettings } from '@/lib/types/company-settings';

interface AttendanceSettingsTabProps {
  draft: CompanySettings;
  saving: boolean;
  onChange: (next: CompanySettings) => void;
  onSave?: () => void;
}

export function AttendanceSettingsTab({
  draft,
  saving,
  onChange,
  onSave,
}: AttendanceSettingsTabProps) {
  const { attendanceBreak, attendancePolicy, attendanceRestrictions } = draft;

  return (
    <div className="space-y-6">
    <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sky-500/15 p-2.5">
          <ShieldCheck className="h-5 w-5 text-sky-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Check-in restrictions</h2>
          <p className="mt-1 text-xs text-subtle">
            Optional rules enforced on kiosk check-ins. Administrators can still add
            manual records with an explicit override when a rule would block the punch.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <RestrictionToggle
          checked={attendanceRestrictions.blockEarlyClockIn}
          onChange={(checked) =>
            onChange({
              ...draft,
              attendanceRestrictions: {
                ...attendanceRestrictions,
                blockEarlyClockIn: checked,
              },
            })
          }
          title="Block early check-ins"
          description="Reject kiosk check-ins that happen too long before the scheduled shift start."
        />

        <div
          className={`rounded-xl border border-border bg-surface-base/50 p-4 transition ${
            attendanceRestrictions.blockEarlyClockIn
              ? 'opacity-100'
              : 'pointer-events-none opacity-40'
          }`}
        >
          <label
            htmlFor="early-clock-in-minutes"
            className="text-xs font-medium uppercase tracking-wide text-muted"
          >
            Early window
          </label>
          <div className="mt-2 flex items-baseline gap-2">
            <input
              id="early-clock-in-minutes"
              type="number"
              min={0}
              step={5}
              disabled={!attendanceRestrictions.blockEarlyClockIn}
              value={attendanceRestrictions.blockEarlyClockInMinutes}
              onChange={(e) =>
                onChange({
                  ...draft,
                  attendanceRestrictions: {
                    ...attendanceRestrictions,
                    blockEarlyClockInMinutes: Math.max(0, Number(e.target.value) || 0),
                  },
                })
              }
              className="w-20 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-lg font-semibold text-white outline-none focus:border-primary/50"
            />
            <span className="text-sm text-subtle">minutes before shift start</span>
          </div>
        </div>

        <RestrictionToggle
          checked={attendanceRestrictions.blockUnscheduledShift}
          onChange={(checked) =>
            onChange({
              ...draft,
              attendanceRestrictions: {
                ...attendanceRestrictions,
                blockUnscheduledShift: checked,
              },
            })
          }
          title="Require a scheduled shift"
          description="Reject kiosk check-ins when the employee has no shift on that date."
        />
      </div>

      <p className="mt-4 rounded-lg border border-border/80 bg-surface-base/40 px-3 py-2 text-xs text-subtle">
        Blocked kiosk attempts are written to audit logs. Manual admin entries show a
        confirmation before overriding these rules.
      </p>
    </section>

    <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-500/15 p-2.5">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Late arrivals & no-shows</h2>
          <p className="mt-1 text-xs text-subtle">
            Grace period before a check-in counts as late. No-show alerts fire when an
            employee still has not checked in after the configured threshold.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface-base/50 p-4">
          <label htmlFor="grace-period" className="text-xs font-medium uppercase tracking-wide text-muted">
            Grace period
          </label>
          <div className="mt-2 flex items-baseline gap-2">
            <input
              id="grace-period"
              type="number"
              min={0}
              step={1}
              value={attendancePolicy.gracePeriodMinutes}
              onChange={(e) =>
                onChange({
                  ...draft,
                  attendancePolicy: {
                    ...attendancePolicy,
                    gracePeriodMinutes: Math.max(0, Number(e.target.value) || 0),
                  },
                })
              }
              className="w-20 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-lg font-semibold text-white outline-none focus:border-primary/50"
            />
            <span className="text-sm text-subtle">minutes after shift start</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-base/50 p-4">
          <label htmlFor="no-show-after" className="text-xs font-medium uppercase tracking-wide text-muted">
            No-show threshold
          </label>
          <div className="mt-2 flex items-baseline gap-2">
            <input
              id="no-show-after"
              type="number"
              min={1}
              step={5}
              value={attendancePolicy.noShowAfterMinutes}
              onChange={(e) =>
                onChange({
                  ...draft,
                  attendancePolicy: {
                    ...attendancePolicy,
                    noShowAfterMinutes: Math.max(1, Number(e.target.value) || 60),
                  },
                })
              }
              className="w-20 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-lg font-semibold text-white outline-none focus:border-primary/50"
            />
            <span className="text-sm text-subtle">minutes after shift start</span>
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-lg border border-border/80 bg-surface-base/40 px-3 py-2 text-xs text-subtle">
        Example: with a 10-minute grace and 60-minute no-show, a 09:00 shift is late after
        09:10 and flagged as no-show at 10:00 if there is still no check-in.
      </p>
    </section>

    <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2.5">
          <Coffee className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Unpaid breaks</h2>
          <p className="mt-1 text-xs text-subtle">
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
              : 'border-border bg-surface-base/50 hover:border-border-strong'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-white">Auto-deduct unpaid break</p>
            <p className="mt-0.5 text-xs text-subtle">
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
          <div className="rounded-xl border border-border bg-surface-base/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-muted">
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
                className="w-20 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-lg font-semibold text-white outline-none focus:border-primary/50"
              />
              <span className="text-sm text-subtle">minutes</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-base/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-muted">
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
                className="w-20 rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-lg font-semibold text-white outline-none focus:border-primary/50"
              />
              <span className="text-sm text-subtle">hours or more</span>
            </div>
          </div>
        </div>

        <p className="rounded-lg border border-border/80 bg-surface-base/40 px-3 py-2 text-xs text-subtle">
          When editing a check-out, admins can mark that the employee did not take a break
          so the deduction is skipped for that session.
        </p>
      </div>

      {onSave ? (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save attendance rules'}
        </button>
      ) : null}
    </section>
    </div>
  );
}

function RestrictionToggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left transition ${
        checked
          ? 'border-sky-500/40 bg-sky-500/10'
          : 'border-border bg-surface-base/50 hover:border-border-strong'
      }`}
    >
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs text-subtle">{description}</p>
      </div>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? 'bg-sky-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </button>
  );
}
