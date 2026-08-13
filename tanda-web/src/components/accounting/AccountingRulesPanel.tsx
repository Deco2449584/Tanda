'use client';

import { useEffect, useState } from 'react';
import { savePayRulesRequest } from '@/lib/accounting/accounting-api';
import type { PayRules } from '@/lib/types/pay-rules';

const inputClass =
  'w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary';

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
  canEdit: boolean;
  onSaved: (rules: PayRules) => Promise<void> | void;
}

export function AccountingRulesPanel({ rules, canEdit, onSaved }: AccountingRulesPanelProps) {
  const [draft, setDraft] = useState<PayRules>(rules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(rules);
  }, [rules]);

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    setError('');
    try {
      await savePayRulesRequest(draft);
      await onSaved(draft);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save rules.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h2 className="text-sm font-semibold text-white">General</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-subtle">Week starts on</span>
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
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-subtle">Hours rounding</span>
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
          </label>
          {draft.hoursRounding === 'nearestMinutes' ? (
            <label className="block">
              <span className="mb-1 block text-xs text-subtle">Nearest minutes</span>
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
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-xs text-subtle">Min pay hours (0 = off)</span>
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
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-subtle">Min charge hours (0 = off)</span>
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
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-subtle">Minimum applies per</span>
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
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Time bands</h2>
          {canEdit ? (
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  timeBands: [
                    ...draft.timeBands,
                    { id: newId('band'), name: 'New band', from: '00:00', to: '06:00' },
                  ],
                })
              }
              className="text-xs font-medium text-primary hover:underline"
            >
              Add band
            </button>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {draft.timeBands.map((band, index) => (
            <div key={band.id} className="grid gap-2 sm:grid-cols-4">
              <input
                disabled={!canEdit}
                value={band.name}
                onChange={(event) => {
                  const timeBands = [...draft.timeBands];
                  timeBands[index] = { ...band, name: event.target.value };
                  setDraft({ ...draft, timeBands });
                }}
                className={inputClass}
                placeholder="Name"
              />
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
              <input
                disabled={!canEdit}
                value={band.to}
                onChange={(event) => {
                  const timeBands = [...draft.timeBands];
                  timeBands[index] = { ...band, to: event.target.value };
                  setDraft({ ...draft, timeBands });
                }}
                className={inputClass}
                placeholder="24:00"
              />
              {canEdit ? (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      timeBands: draft.timeBands.filter((item) => item.id !== band.id),
                    })
                  }
                  className="text-xs text-rose-400 hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Day types</h2>
          {canEdit ? (
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  dayTypes: [
                    ...draft.dayTypes,
                    { id: newId('day'), name: 'New day type', weekdays: [] },
                  ],
                })
              }
              className="text-xs font-medium text-primary hover:underline"
            >
              Add day type
            </button>
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          {draft.dayTypes.map((dayType, index) => (
            <div key={dayType.id} className="space-y-2 rounded-xl border border-border/60 p-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  disabled={!canEdit}
                  value={dayType.name}
                  onChange={(event) => {
                    const dayTypes = [...draft.dayTypes];
                    dayTypes[index] = { ...dayType, name: event.target.value };
                    setDraft({ ...draft, dayTypes });
                  }}
                  className={inputClass}
                  placeholder="Name"
                />
                <label className="flex items-center gap-2 text-sm text-muted">
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
                {canEdit && draft.dayTypes.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        dayTypes: draft.dayTypes.filter((item) => item.id !== dayType.id),
                      })
                    }
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {!dayType.publicHoliday ? (
                <div className="flex flex-wrap gap-2">
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
                        className={`rounded-lg border px-2 py-1 text-xs ${
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
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <h2 className="text-sm font-semibold text-white">Overtime</h2>
        <p className="mt-1 text-xs text-subtle">Set threshold to 0 to turn a rule off.</p>
        <div className="mt-4 space-y-3">
          {draft.overtimeRules.map((rule, index) => (
            <div key={rule.id} className="grid gap-2 sm:grid-cols-3">
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
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
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
              {canEdit ? (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      overtimeRules: draft.overtimeRules.filter((item) => item.id !== rule.id),
                    })
                  }
                  className="text-xs text-rose-400 hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {canEdit ? (
            <button
              type="button"
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
              className="text-xs font-medium text-primary hover:underline"
            >
              Add overtime rule
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Public holidays</h2>
          {canEdit ? (
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  publicHolidays: [...draft.publicHolidays, { date: '' }],
                })
              }
              className="text-xs font-medium text-primary hover:underline"
            >
              Add date
            </button>
          ) : null}
        </div>
        <div className="mt-4 space-y-2">
          {draft.publicHolidays.length === 0 ? (
            <p className="text-sm text-subtle">No holidays configured.</p>
          ) : (
            draft.publicHolidays.map((holiday, index) => (
              <div key={`${holiday.date}-${index}`} className="flex gap-2">
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
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        publicHolidays: draft.publicHolidays.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Employment types & GL</h2>
            <p className="mt-1 text-xs text-subtle">
              Journal exports debit the expense account and credit the payable account.
            </p>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  employmentTypes: [
                    ...draft.employmentTypes,
                    { id: newId('type'), label: 'New type' },
                  ],
                })
              }
              className="text-xs font-medium text-primary hover:underline"
            >
              Add type
            </button>
          ) : null}
        </div>
        <div className="mt-4 space-y-4">
          {draft.employmentTypes.map((type, index) => (
            <div key={type.id} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input
                disabled={!canEdit}
                value={type.label}
                onChange={(event) => {
                  const employmentTypes = [...draft.employmentTypes];
                  employmentTypes[index] = { ...type, label: event.target.value };
                  setDraft({ ...draft, employmentTypes });
                }}
                className={inputClass}
                placeholder="Label"
              />
              <input
                disabled={!canEdit}
                value={type.expenseAccountCode ?? ''}
                onChange={(event) => {
                  const employmentTypes = [...draft.employmentTypes];
                  employmentTypes[index] = { ...type, expenseAccountCode: event.target.value };
                  setDraft({ ...draft, employmentTypes });
                }}
                className={inputClass}
                placeholder="Expense code"
              />
              <input
                disabled={!canEdit}
                value={type.expenseAccountName ?? ''}
                onChange={(event) => {
                  const employmentTypes = [...draft.employmentTypes];
                  employmentTypes[index] = { ...type, expenseAccountName: event.target.value };
                  setDraft({ ...draft, employmentTypes });
                }}
                className={inputClass}
                placeholder="Expense name"
              />
              <input
                disabled={!canEdit}
                value={type.payableAccountCode ?? ''}
                onChange={(event) => {
                  const employmentTypes = [...draft.employmentTypes];
                  employmentTypes[index] = { ...type, payableAccountCode: event.target.value };
                  setDraft({ ...draft, employmentTypes });
                }}
                className={inputClass}
                placeholder="Payable code"
              />
              <input
                disabled={!canEdit}
                value={type.payableAccountName ?? ''}
                onChange={(event) => {
                  const employmentTypes = [...draft.employmentTypes];
                  employmentTypes[index] = { ...type, payableAccountName: event.target.value };
                  setDraft({ ...draft, employmentTypes });
                }}
                className={inputClass}
                placeholder="Payable name"
              />
              {canEdit && draft.employmentTypes.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      employmentTypes: draft.employmentTypes.filter((item) => item.id !== type.id),
                    })
                  }
                  className="text-xs text-rose-400 hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {canEdit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save rules'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
