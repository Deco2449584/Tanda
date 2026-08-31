'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { savePayRulesRequest } from '@/lib/accounting/accounting-api';
import { DEFAULT_PAY_RULES } from '@/lib/payroll/default-pay-rules';
import { validatePayRules } from '@/lib/payroll/validate-pay-rules';
import type { Location } from '@/lib/types/location';
import type { PayRules } from '@/lib/types/pay-rules';

const inputClass =
  'w-full min-w-0 rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-subtle">{hint}</span> : null}
    </label>
  );
}

function AddButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 self-start rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
    >
      {children}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
    >
      Remove
    </button>
  );
}

function EditorCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-base/40">
      <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-white/[0.03] px-3.5 py-2.5">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        {onRemove ? <RemoveButton onClick={onRemove} /> : null}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

interface AccountingRulesPanelProps {
  rules: PayRules;
  locations: Location[];
  canEdit: boolean;
  onSaved: (rules: PayRules) => Promise<void> | void;
}

export function AccountingRulesPanel({
  rules,
  locations,
  canEdit,
  onSaved,
}: AccountingRulesPanelProps) {
  const [draft, setDraft] = useState<PayRules>(rules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    setDraft(rules);
  }, [rules]);

  async function handleSave() {
    if (!canEdit) return;
    const issues = validatePayRules(draft);
    if (issues.length > 0) {
      setError(issues.join(' '));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await savePayRulesRequest(draft);
      await onSaved(draft);
      setToast({
        id: `rules-saved-${Date.now()}`,
        text: 'Rules saved successfully.',
        variant: 'success',
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save rules.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
          <p className="text-sm font-medium text-rose-400">Validation error</p>
          <p className="mt-1 text-sm text-rose-300/80">{error}</p>
        </div>
      ) : null}

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
        <h2 className="text-sm font-semibold text-white">Week rules</h2>
        <p className="mt-1 text-xs text-subtle">
          Configure which day the pay week starts and how hours are rounded for invoicing.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Week starts on">
            <select
              disabled={!canEdit}
              value={draft.weekStartsOn}
              onChange={(event) =>
                setDraft({ ...draft, weekStartsOn: Number(event.target.value) })
              }
              className={inputClass}
            >
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hours rounding">
            <select
              disabled={!canEdit}
              value={draft.hoursRounding}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  hoursRounding: event.target.value as PayRules['hoursRounding'],
                })
              }
              className={inputClass}
            >
              <option value="2dp">2 decimal places</option>
              <option value="none">None</option>
              <option value="nearestMinutes">Nearest minutes</option>
            </select>
          </Field>
          {draft.hoursRounding === 'nearestMinutes' ? (
            <Field label="Nearest minutes">
              <input
                type="number"
                min="1"
                disabled={!canEdit}
                value={draft.nearestMinutes ?? 15}
                onChange={(event) =>
                  setDraft({ ...draft, nearestMinutes: Number(event.target.value) || 15 })
                }
                className={inputClass}
              />
            </Field>
          ) : null}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
        <h2 className="text-sm font-semibold text-white">Minimums and leave</h2>
        <p className="mt-1 text-xs text-subtle">
          Minimum hours ensure staff are paid/charged for at least a set amount per session or day. Leave settings control whether approved leave generates award lines.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Min pay hours" hint="0 turns this off">
            <input
              type="number"
              min="0"
              step="0.25"
              disabled={!canEdit}
              value={draft.minPayHours}
              onChange={(event) =>
                setDraft({ ...draft, minPayHours: Number(event.target.value) || 0 })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Min charge hours" hint="0 turns this off">
            <input
              type="number"
              min="0"
              step="0.25"
              disabled={!canEdit}
              value={draft.minChargeHours}
              onChange={(event) =>
                setDraft({ ...draft, minChargeHours: Number(event.target.value) || 0 })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Minimum applies per">
            <select
              disabled={!canEdit}
              value={draft.minHoursScope}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  minHoursScope: event.target.value === 'day' ? 'day' : 'session',
                })
              }
              className={inputClass}
            >
              <option value="session">Session</option>
              <option value="day">Day</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 self-start rounded-lg border border-border/70 bg-surface-base/50 px-3 py-2.5 text-sm text-muted sm:self-end">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={draft.payApprovedLeave}
              onChange={(event) =>
                setDraft({ ...draft, payApprovedLeave: event.target.checked })
              }
            />
            Pay approved leave in the award
          </label>
          {draft.payApprovedLeave ? (
            <Field label="Paid leave hours per day">
              <input
                type="number"
                min="0"
                step="0.25"
                disabled={!canEdit}
                value={draft.paidLeaveHoursPerDay ?? 8}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    paidLeaveHoursPerDay: Number(event.target.value) || 0,
                  })
                }
                className={inputClass}
              />
            </Field>
          ) : null}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Time bands</h2>
            <p className="mt-1 text-xs text-subtle">
              Named parts of the day used as columns in the rate cards. Overnight bands can wrap, e.g. 22:00–06:00.
            </p>
          </div>
          {canEdit ? (
            <AddButton
              onClick={() =>
                setDraft({
                  ...draft,
                  timeBands: [
                    ...draft.timeBands,
                    { id: newId('band'), name: 'New band', from: '00:00', to: '06:00' },
                  ],
                })
              }
            >
              Add band
            </AddButton>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {draft.timeBands.map((band, index) => (
            <EditorCard
              key={band.id}
              title={`Band ${index + 1}`}
              onRemove={
                canEdit
                  ? () =>
                      setDraft({
                        ...draft,
                        timeBands: draft.timeBands.filter((item) => item.id !== band.id),
                      })
                  : undefined
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name">
                  <input
                    disabled={!canEdit}
                    value={band.name}
                    onChange={(event) => {
                      const timeBands = [...draft.timeBands];
                      timeBands[index] = { ...band, name: event.target.value };
                      setDraft({ ...draft, timeBands });
                    }}
                    className={inputClass}
                    placeholder="Early morning"
                  />
                </Field>
                <Field label="Starts" hint="24-hour, e.g. 00:00">
                  <input
                    disabled={!canEdit}
                    value={band.from}
                    onChange={(event) => {
                      const timeBands = [...draft.timeBands];
                      timeBands[index] = { ...band, from: event.target.value };
                      setDraft({ ...draft, timeBands });
                    }}
                    className={inputClass}
                    placeholder="00:00"
                  />
                </Field>
                <Field label="Ends" hint="24-hour, e.g. 06:00">
                  <input
                    disabled={!canEdit}
                    value={band.to}
                    onChange={(event) => {
                      const timeBands = [...draft.timeBands];
                      timeBands[index] = { ...band, to: event.target.value };
                      setDraft({ ...draft, timeBands });
                    }}
                    className={inputClass}
                    placeholder="06:00"
                  />
                </Field>
              </div>
            </EditorCard>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Day types</h2>
            <p className="mt-1 text-xs text-subtle">
              Categories of days used as columns in the rate cards. Tap the days that belong to each type.
            </p>
          </div>
          {canEdit ? (
            <AddButton
              onClick={() =>
                setDraft({
                  ...draft,
                  dayTypes: [
                    ...draft.dayTypes,
                    { id: newId('day'), name: 'New day type', weekdays: [] },
                  ],
                })
              }
            >
              Add day type
            </AddButton>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {draft.dayTypes.map((dayType, index) => (
            <EditorCard
              key={dayType.id}
              title={dayType.name.trim() || `Day type ${index + 1}`}
              onRemove={
                canEdit && draft.dayTypes.length > 1
                  ? () =>
                      setDraft({
                        ...draft,
                        dayTypes: draft.dayTypes.filter((item) => item.id !== dayType.id),
                      })
                  : undefined
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    disabled={!canEdit}
                    value={dayType.name}
                    onChange={(event) => {
                      const dayTypes = [...draft.dayTypes];
                      dayTypes[index] = { ...dayType, name: event.target.value };
                      setDraft({ ...draft, dayTypes });
                    }}
                    className={inputClass}
                    placeholder="Monday to Friday"
                  />
                </Field>
                <label className="flex items-center gap-2 self-end rounded-lg border border-border/70 bg-surface-base/50 px-3 py-2.5 text-sm text-muted">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={dayType.publicHoliday === true}
                    onChange={(event) => {
                      const dayTypes = [...draft.dayTypes];
                      dayTypes[index] = {
                        ...dayType,
                        publicHoliday: event.target.checked,
                      };
                      setDraft({ ...draft, dayTypes });
                    }}
                  />
                  Public holiday
                </label>
              </div>
              {!dayType.publicHoliday ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-muted">Applies on</p>
                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((day) => {
                      const selected = dayType.weekdays?.includes(day.value) === true;
                      return (
                        <button
                          key={day.value}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => {
                            const current = dayType.weekdays ?? [];
                            const weekdays = selected
                              ? current.filter((value) => value !== day.value)
                              : [...current, day.value];
                            const dayTypes = [...draft.dayTypes];
                            dayTypes[index] = { ...dayType, weekdays };
                            setDraft({ ...draft, dayTypes });
                          }}
                          className={`min-w-0 rounded-lg border px-0 py-2 text-center text-[11px] font-medium ${
                            selected
                              ? 'border-primary/50 bg-primary/15 text-primary'
                              : 'border-border text-muted'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-subtle">
                  Used automatically on dates listed under Public holidays.
                </p>
              )}
            </EditorCard>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Overtime</h2>
            <p className="mt-1 text-xs text-subtle">
              Set the threshold to 0 to turn a rule off. Daily overtime is marked first, then weekly.
            </p>
          </div>
          {canEdit ? (
            <AddButton
              onClick={() =>
                setDraft({
                  ...draft,
                  overtimeRules: [
                    ...draft.overtimeRules,
                    {
                      id: newId('ot'),
                      scope: 'daily',
                      thresholdHours: 8,
                      applyTo: 'overtime',
                    },
                  ],
                })
              }
            >
              Add overtime rule
            </AddButton>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {draft.overtimeRules.map((rule, index) => (
            <EditorCard
              key={rule.id}
              title={rule.scope === 'weekly' ? 'Weekly overtime' : 'Daily overtime'}
              onRemove={
                canEdit
                  ? () =>
                      setDraft({
                        ...draft,
                        overtimeRules: draft.overtimeRules.filter((item) => item.id !== rule.id),
                      })
                  : undefined
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Applies">
                  <select
                    disabled={!canEdit}
                    value={rule.scope}
                    onChange={(event) => {
                      const overtimeRules = [...draft.overtimeRules];
                      overtimeRules[index] = {
                        ...rule,
                        scope: event.target.value === 'weekly' ? 'weekly' : 'daily',
                      };
                      setDraft({ ...draft, overtimeRules });
                    }}
                    className={inputClass}
                  >
                    <option value="daily">After hours in a day</option>
                    <option value="weekly">After hours in a week</option>
                  </select>
                </Field>
                <Field label="Hours before overtime">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    disabled={!canEdit}
                    value={rule.thresholdHours}
                    onChange={(event) => {
                      const overtimeRules = [...draft.overtimeRules];
                      overtimeRules[index] = {
                        ...rule,
                        thresholdHours: Number(event.target.value) || 0,
                      };
                      setDraft({ ...draft, overtimeRules });
                    }}
                    className={inputClass}
                  />
                </Field>
              </div>
            </EditorCard>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Public holidays</h2>
            <p className="mt-1 text-xs text-subtle">
              Dates that trigger the public holiday day type. Optionally restrict to specific sites.
            </p>
          </div>
          {canEdit ? (
            <AddButton
              onClick={() =>
                setDraft({
                  ...draft,
                  publicHolidays: [...draft.publicHolidays, { date: '' }],
                })
              }
            >
              Add date
            </AddButton>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {draft.publicHolidays.length === 0 ? (
            <p className="text-sm text-subtle">No holidays configured.</p>
          ) : (
            draft.publicHolidays.map((holiday, index) => (
              <EditorCard
                key={`${holiday.date}-${index}`}
                title={holiday.date || `Holiday ${index + 1}`}
                onRemove={
                  canEdit
                    ? () =>
                        setDraft({
                          ...draft,
                          publicHolidays: draft.publicHolidays.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        })
                    : undefined
                }
              >
                <Field label="Date">
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={holiday.date}
                    onChange={(event) => {
                      const publicHolidays = [...draft.publicHolidays];
                      publicHolidays[index] = { ...holiday, date: event.target.value };
                      setDraft({ ...draft, publicHolidays });
                    }}
                    className={inputClass}
                  />
                </Field>
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-muted">
                    Sites <span className="font-normal text-subtle">(none selected = all sites)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {locations.map((location) => {
                      const selected =
                        holiday.locationIds?.includes(location.id) === true;
                      return (
                        <button
                          key={location.id}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => {
                            const current = holiday.locationIds ?? [];
                            const locationIds = selected
                              ? current.filter((id) => id !== location.id)
                              : [...current, location.id];
                            const publicHolidays = [...draft.publicHolidays];
                            publicHolidays[index] = { ...holiday, locationIds };
                            setDraft({ ...draft, publicHolidays });
                          }}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                            selected
                              ? 'border-primary/50 bg-primary/15 text-primary'
                              : 'border-border text-muted'
                          }`}
                        >
                          {location.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </EditorCard>
            ))
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Allowances</h2>
            <p className="mt-1 text-xs text-subtle">
              Flat amounts on pay, charge, or both. Per hour uses paid hours; per session is once.
            </p>
          </div>
          {canEdit ? (
            <AddButton
              onClick={() =>
                setDraft({
                  ...draft,
                  allowances: [
                    ...draft.allowances,
                    {
                      id: newId('allw'),
                      name: 'New allowance',
                      amount: 0,
                      per: 'hour',
                      side: 'pay',
                    },
                  ],
                })
              }
            >
              Add allowance
            </AddButton>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {draft.allowances.length === 0 ? (
            <p className="text-sm text-subtle">No allowances.</p>
          ) : (
            draft.allowances.map((allowance, index) => (
              <EditorCard
                key={allowance.id}
                title={allowance.name.trim() || `Allowance ${index + 1}`}
                onRemove={
                  canEdit
                    ? () =>
                        setDraft({
                          ...draft,
                          allowances: draft.allowances.filter((item) => item.id !== allowance.id),
                        })
                    : undefined
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name">
                    <input
                      disabled={!canEdit}
                      value={allowance.name}
                      onChange={(event) => {
                        const allowances = [...draft.allowances];
                        allowances[index] = { ...allowance, name: event.target.value };
                        setDraft({ ...draft, allowances });
                      }}
                      className={inputClass}
                      placeholder="Meal allowance"
                    />
                  </Field>
                  <Field label="Amount ($)">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!canEdit}
                      value={allowance.amount}
                      onChange={(event) => {
                        const allowances = [...draft.allowances];
                        allowances[index] = {
                          ...allowance,
                          amount: Number(event.target.value) || 0,
                        };
                        setDraft({ ...draft, allowances });
                      }}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Paid">
                    <select
                      disabled={!canEdit}
                      value={allowance.per}
                      onChange={(event) => {
                        const allowances = [...draft.allowances];
                        allowances[index] = {
                          ...allowance,
                          per: event.target.value === 'session' ? 'session' : 'hour',
                        };
                        setDraft({ ...draft, allowances });
                      }}
                      className={inputClass}
                    >
                      <option value="hour">Per hour</option>
                      <option value="session">Per session</option>
                    </select>
                  </Field>
                  <Field label="Applies to">
                    <select
                      disabled={!canEdit}
                      value={allowance.side}
                      onChange={(event) => {
                        const allowances = [...draft.allowances];
                        allowances[index] = {
                          ...allowance,
                          side:
                            event.target.value === 'charge' || event.target.value === 'both'
                              ? event.target.value
                              : 'pay',
                        };
                        setDraft({ ...draft, allowances });
                      }}
                      className={inputClass}
                    >
                      <option value="pay">Pay</option>
                      <option value="charge">Charge</option>
                      <option value="both">Pay and charge</option>
                    </select>
                  </Field>
                </div>
              </EditorCard>
            ))
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Employment types & GL</h2>
            <p className="mt-1 text-xs text-subtle">
              Used on journal and Xero bill exports: debit the expense account and credit the payable
              account. Set Wage vs Contracting Expense codes here to match Xero.
            </p>
          </div>
          {canEdit ? (
            <AddButton
              onClick={() =>
                setDraft({
                  ...draft,
                  employmentTypes: [
                    ...draft.employmentTypes,
                    { id: newId('type'), label: 'New type' },
                  ],
                })
              }
            >
              Add type
            </AddButton>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {draft.employmentTypes.map((type, index) => (
            <EditorCard
              key={type.id}
              title={type.label.trim() || `Employment type ${index + 1}`}
              onRemove={
                canEdit && draft.employmentTypes.length > 1
                  ? () =>
                      setDraft({
                        ...draft,
                        employmentTypes: draft.employmentTypes.filter((item) => item.id !== type.id),
                      })
                  : undefined
              }
            >
              <Field label="Type name">
                <input
                  disabled={!canEdit}
                  value={type.label}
                  onChange={(event) => {
                    const employmentTypes = [...draft.employmentTypes];
                    employmentTypes[index] = { ...type, label: event.target.value };
                    setDraft({ ...draft, employmentTypes });
                  }}
                  className={inputClass}
                    placeholder="Full Time"
                />
              </Field>
              <p className="mt-4 text-xs font-medium text-muted">Expense account (debit)</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field label="Code">
                  <input
                    disabled={!canEdit}
                    value={type.expenseAccountCode ?? ''}
                    onChange={(event) => {
                      const employmentTypes = [...draft.employmentTypes];
                      employmentTypes[index] = { ...type, expenseAccountCode: event.target.value };
                      setDraft({ ...draft, employmentTypes });
                    }}
                    className={inputClass}
                    placeholder="6100"
                  />
                </Field>
                <Field label="Name">
                  <input
                    disabled={!canEdit}
                    value={type.expenseAccountName ?? ''}
                    onChange={(event) => {
                      const employmentTypes = [...draft.employmentTypes];
                      employmentTypes[index] = { ...type, expenseAccountName: event.target.value };
                      setDraft({ ...draft, employmentTypes });
                    }}
                    className={inputClass}
                    placeholder="Wage"
                  />
                </Field>
              </div>
              <p className="mt-4 text-xs font-medium text-muted">Payable account (credit)</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field label="Code">
                  <input
                    disabled={!canEdit}
                    value={type.payableAccountCode ?? ''}
                    onChange={(event) => {
                      const employmentTypes = [...draft.employmentTypes];
                      employmentTypes[index] = { ...type, payableAccountCode: event.target.value };
                      setDraft({ ...draft, employmentTypes });
                    }}
                    className={inputClass}
                    placeholder="2100"
                  />
                </Field>
                <Field label="Name">
                  <input
                    disabled={!canEdit}
                    value={type.payableAccountName ?? ''}
                    onChange={(event) => {
                      const employmentTypes = [...draft.employmentTypes];
                      employmentTypes[index] = { ...type, payableAccountName: event.target.value };
                      setDraft({ ...draft, employmentTypes });
                    }}
                    className={inputClass}
                    placeholder="Wages payable"
                  />
                </Field>
              </div>
              <div className="mt-4 max-w-[12rem]">
                <Field label="Super %" hint="Memo only">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!canEdit}
                    value={type.superPercent ?? ''}
                    placeholder="12"
                    onChange={(event) => {
                      const raw = event.target.value;
                      const employmentTypes = [...draft.employmentTypes];
                      employmentTypes[index] = {
                        ...type,
                        superPercent: raw === '' ? undefined : Number(raw) || 0,
                      };
                      setDraft({ ...draft, employmentTypes });
                    }}
                    className={inputClass}
                  />
                </Field>
              </div>
            </EditorCard>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
        <div>
          <h2 className="text-sm font-semibold text-white">Xero export settings</h2>
          <p className="mt-1 text-xs text-subtle">
            These values fill the Sales Invoice and Bill CSV columns when you export. Match them to
            your Xero chart of accounts and tax rates — example values are shown until you change them.
            Expense account codes for bills still come from each employment type above.
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <EditorCard title="Sales invoices (charges to clients)">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Sales account code"
                hint="Xero income account for labour charges (*AccountCode)"
              >
                <input
                  disabled={!canEdit}
                  value={draft.xero?.salesAccountCode ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        salesAccountCode: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="200"
                />
              </Field>
              <Field
                label="Sales tax type"
                hint="Must match a TaxType name in your Xero organisation exactly"
              >
                <input
                  disabled={!canEdit}
                  value={draft.xero?.salesTaxType ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        salesTaxType: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="GST on Income"
                />
              </Field>
              <Field
                label="Invoice number prefix"
                hint="Becomes PREFIX-YYYYMMDD-SITE (e.g. SI-20260308-LOC1)"
              >
                <input
                  disabled={!canEdit}
                  value={draft.xero?.salesInvoicePrefix ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        salesInvoicePrefix: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="SI"
                />
              </Field>
              <Field label="Due days after invoice date" hint="DueDate = week end date + this many days">
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={!canEdit}
                  value={draft.xero?.dueDays ?? 14}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        dueDays: Number(event.target.value) || 0,
                      },
                    })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field
                label="Description template"
                hint="Placeholders: {period} = pay week label, {site} = warehouse/customer name"
              >
                <input
                  disabled={!canEdit}
                  value={draft.xero?.salesDescriptionTemplate ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        salesDescriptionTemplate: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="Labour charge — {period} — {site}"
                />
              </Field>
            </div>
          </EditorCard>

          <EditorCard title="Bills (pays to staff / contractors)">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Bills tax type"
                hint="Must match a TaxType name in Xero (wages are often BAS Excluded)"
              >
                <input
                  disabled={!canEdit}
                  value={draft.xero?.billsTaxType ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        billsTaxType: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="GST on Expenses"
                />
              </Field>
              <Field
                label="Bill number prefix"
                hint="Becomes PREFIX-YYYYMMDD-EMPLOYEEID (e.g. BILL-20260308-E123)"
              >
                <input
                  disabled={!canEdit}
                  value={draft.xero?.billsInvoicePrefix ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        billsInvoicePrefix: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="BILL"
                />
              </Field>
              <Field
                label="Contact name mode"
                hint="Who appears in *ContactName on each bill line"
              >
                <select
                  disabled={!canEdit}
                  value={draft.xero?.billsContactMode ?? 'per_staff'}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        billsContactMode:
                          event.target.value === 'shared' ? 'shared' : 'per_staff',
                      },
                    })
                  }
                  className={inputClass}
                >
                  <option value="per_staff">One contact per staff member</option>
                  <option value="shared">Single shared contact for all bills</option>
                </select>
              </Field>
              <Field
                label="Shared contact name"
                hint="Only used when contact mode is “shared” (e.g. Payroll)"
              >
                <input
                  disabled={!canEdit || draft.xero?.billsContactMode !== 'shared'}
                  value={draft.xero?.billsSharedContactName ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        billsSharedContactName: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="Payroll"
                />
              </Field>
              <Field
                label="Fallback expense account code"
                hint="Used if an employment type has no expense code set"
              >
                <input
                  disabled={!canEdit}
                  value={draft.xero?.billsFallbackAccountCode ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        billsFallbackAccountCode: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="6100"
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field
                label="Description template"
                hint="Placeholders: {period} = pay week label, {staff} = person name"
              >
                <input
                  disabled={!canEdit}
                  value={draft.xero?.billsDescriptionTemplate ?? ''}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      xero: {
                        ...(draft.xero ?? DEFAULT_PAY_RULES.xero!),
                        billsDescriptionTemplate: event.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="Wages — {period} — {staff}"
                />
              </Field>
            </div>
            <p className="mt-3 text-[11px] text-subtle">
              Due date for bills uses the same “Due days after invoice date” as sales invoices.
            </p>
          </EditorCard>
        </div>
      </section>

      {canEdit ? (
        <div className="flex sm:justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'Saving…' : 'Save rules'}
          </button>
        </div>
      ) : null}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
