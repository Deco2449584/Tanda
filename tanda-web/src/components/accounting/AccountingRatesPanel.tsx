'use client';

import { useMemo, useState } from 'react';
import { FormAlert } from '@/components/employees/employee-form-ui';
import { Toast, type ToastMessage } from '@/components/ui/Toast';
import { RateMatrixEditor } from '@/components/accounting/RateMatrixEditor';
import { OverrideValueField } from '@/components/accounting/OverrideValueField';
import {
  savePayRulesRequest,
  saveSiteBillingRequest,
  saveStaffRatesRequest,
} from '@/lib/accounting/accounting-api';
import { isPayrollEligibleEmployee } from '@/lib/employees/is-payroll-eligible-employee';
import {
  withSyncedBaseRate,
  baseHourlyRateFromCells,
  effectiveHourlyRate,
} from '@/lib/payroll/rate-matrix';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type {
  PayRateCells,
  PayRules,
  PayTimeBand,
  SiteBilling,
  StaffPayRates,
} from '@/lib/types/pay-rules';

const inputClass =
  'w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary';

function formatMoney(value: number): string {
  return value.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

interface AccountingRatesPanelProps {
  rules: PayRules;
  employees: Employee[];
  locations: Location[];
  canEdit: boolean;
  canEditRules: boolean;
  onStaffSaved: () => Promise<void> | void;
  onSiteSaved: () => Promise<void> | void;
  onRulesSaved: () => Promise<void> | void;
}

export function AccountingRatesPanel({
  rules,
  employees,
  locations,
  canEdit,
  canEditRules,
  onStaffSaved,
  onSiteSaved,
  onRulesSaved,
}: AccountingRatesPanelProps) {
  const [side, setSide] = useState<'staff' | 'sites' | 'company'>('staff');
  const [staffId, setStaffId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [copyFromId, setCopyFromId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const staff = useMemo(() => employees.filter(isPayrollEligibleEmployee), [employees]);

  const selectedStaff = staff.find((item) => item.id === staffId) ?? staff[0];
  const selectedSite = locations.find((item) => item.id === siteId) ?? locations[0];

  const [staffDraft, setStaffDraft] = useState<{
    employmentTypeId: string;
    payRates: StaffPayRates;
    hourlyRate: number;
    /** Independent of hourlyRate so Edit works before a number is typed. */
    baseRateMode: 'default' | 'custom';
  } | null>(null);
  const [siteDraft, setSiteDraft] = useState<SiteBilling | null>(null);
  const [companyPay, setCompanyPay] = useState<PayRateCells | null>(null);
  const [companyCharge, setCompanyCharge] = useState<PayRateCells | null>(null);
  const [companyHourlyRate, setCompanyHourlyRate] = useState<number | null>(null);
  const [companyMinPayHours, setCompanyMinPayHours] = useState<number | null>(null);
  const [companyMinChargeHours, setCompanyMinChargeHours] = useState<number | null>(null);
  const [companyMinHoursScope, setCompanyMinHoursScope] = useState<
    'session' | 'day' | null
  >(null);

  const staffKey = selectedStaff?.id ?? '';
  const siteKey = selectedSite?.id ?? '';
  const activeStaffId = staffId || staffKey;
  const activeSiteId = siteId || siteKey;

  const currentStaff =
    staffDraft && activeStaffId && activeStaffId === staffKey
      ? staffDraft
      : selectedStaff
        ? {
              employmentTypeId:
                selectedStaff.employmentTypeId || rules.employmentTypes[0]?.id || 'full_time',
            payRates: selectedStaff.payRates ?? {},
            hourlyRate: selectedStaff.hourlyRate || 0,
            baseRateMode:
              selectedStaff.hourlyRate > 0
                ? ('custom' as const)
                : ('default' as const),
          }
        : null;

  const currentSite =
    siteDraft && activeSiteId && activeSiteId === siteKey ? siteDraft : selectedSite?.billing ?? {};

  async function saveStaff(history?: StaffPayRates[]) {
    if (!selectedStaff || !currentStaff || !canEdit) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payRates = withSyncedBaseRate(currentStaff.payRates, currentStaff.hourlyRate);
      await saveStaffRatesRequest({
        employeeDocId: selectedStaff.id,
        employmentTypeId: currentStaff.employmentTypeId,
        payRates,
        hourlyRate: currentStaff.hourlyRate,
        payRateHistory: history ?? selectedStaff.payRateHistory,
      });
      await onStaffSaved();
      setStaffDraft(null);
      setMessage(`Saved rates for ${selectedStaff.name}.`);
      setToast({
        id: `staff-rates-saved-${Date.now()}`,
        text: `Saved rates for ${selectedStaff.name}.`,
        variant: 'success',
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save staff rates.');
    } finally {
      setSaving(false);
    }
  }

  async function saveSite(history?: SiteBilling[]) {
    if (!selectedSite || !canEdit) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveSiteBillingRequest({
        locationId: selectedSite.id,
        billing: currentSite,
        billingHistory: history ?? selectedSite.billingHistory,
      });
      await onSiteSaved();
      setSiteDraft(null);
      setMessage(`Saved billing for ${selectedSite.name}.`);
      setToast({
        id: `site-billing-saved-${Date.now()}`,
        text: `Saved billing for ${selectedSite.name}.`,
        variant: 'success',
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save site billing.');
    } finally {
      setSaving(false);
    }
  }

  async function copyFrom() {
    const source = staff.find((item) => item.id === copyFromId);
    if (!source || !selectedStaff || !currentStaff) return;
    setStaffDraft({
      employmentTypeId: source.employmentTypeId || currentStaff.employmentTypeId,
      hourlyRate: source.hourlyRate || currentStaff.hourlyRate,
      baseRateMode:
        (source.hourlyRate || currentStaff.hourlyRate) > 0 ? 'custom' : 'default',
      payRates: { ...(source.payRates ?? {}) },
    });
    setMessage(`Copied matrix from ${source.name}. Save to keep it.`);
    setToast({
      id: `staff-copy-${Date.now()}`,
      text: `Copied matrix from ${source.name}. Save to keep it.`,
      variant: 'info',
    });
  }

  async function saveCompanyDefaults() {
    if (!canEditRules) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await savePayRulesRequest({
        ...rules,
        defaultHourlyRate: companyHourlyRate ?? rules.defaultHourlyRate ?? 0,
        minPayHours: companyMinPayHours ?? rules.minPayHours,
        minChargeHours: companyMinChargeHours ?? rules.minChargeHours,
        minHoursScope: companyMinHoursScope ?? rules.minHoursScope,
        defaultPayCells: companyPay ?? rules.defaultPayCells,
        defaultChargeCells: companyCharge ?? rules.defaultChargeCells,
      });
      await onRulesSaved();
      setCompanyHourlyRate(null);
      setCompanyMinPayHours(null);
      setCompanyMinChargeHours(null);
      setCompanyMinHoursScope(null);
      setMessage('Saved company defaults.');
      setToast({
        id: `company-defaults-saved-${Date.now()}`,
        text: 'Saved company defaults.',
        variant: 'success',
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save company defaults.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-surface-base/40 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:border-0 sm:bg-transparent sm:p-0">
        {(
          [
            ['staff', 'Staff'],
            ['sites', 'Clients'],
            ['company', 'Defaults'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSide(id)}
            className={`shrink-0 rounded-lg border px-3 py-2 text-center text-xs font-medium sm:px-3 sm:text-sm ${
              side === id
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border/70 text-muted hover:border-border'
            }`}
          >
            <span className="sm:hidden">{label}</span>
            <span className="hidden sm:inline">{id === 'company' ? 'Company defaults' : label}</span>
          </button>
        ))}
      </div>

      {side === 'staff' ? (
        <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
          {staff.length === 0 ? (
            <p className="text-sm text-subtle">No payroll-eligible employees.</p>
          ) : currentStaff && selectedStaff ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Employee</span>
                  <select
                    value={selectedStaff.id}
                    onChange={(event) => {
                      setStaffId(event.target.value);
                      setStaffDraft(null);
                    }}
                    className={inputClass}
                  >
                    {staff.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                        {employee.employeeId ? ` (${employee.employeeId})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Employment type</span>
                  <select
                    disabled={!canEdit}
                    value={currentStaff.employmentTypeId}
                    onChange={(event) =>
                      setStaffDraft({
                        ...currentStaff,
                        employmentTypeId: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    {rules.employmentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Min pay hours</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    disabled={!canEdit}
                    placeholder={`${rules.minPayHours} (company default)`}
                    value={currentStaff.payRates.minPayHours ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setStaffDraft({
                        ...currentStaff,
                        payRates: {
                          ...currentStaff.payRates,
                          minPayHours: raw === '' ? null : Number(raw) || 0,
                        },
                      });
                    }}
                    className={inputClass}
                  />
                  {currentStaff.payRates.minPayHours == null ? (
                    <p className="mt-1 text-[11px] text-subtle">
                      Inherits {rules.minPayHours} h from company defaults.
                    </p>
                  ) : null}
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-xs text-subtle">
                    Base hourly rate ($)
                  </span>
                  <OverrideValueField
                    disabled={!canEdit}
                    mode={currentStaff.baseRateMode}
                    onModeChange={(mode) => {
                      if (mode === 'default') {
                        setStaffDraft({
                          ...currentStaff,
                          baseRateMode: 'default',
                          hourlyRate: 0,
                        });
                        return;
                      }

                      const seed =
                        currentStaff.hourlyRate > 0
                          ? currentStaff.hourlyRate
                          : effectiveHourlyRate(0, rules) ||
                            baseHourlyRateFromCells(currentStaff.payRates.cells, 0);

                      setStaffDraft({
                        ...currentStaff,
                        baseRateMode: 'custom',
                        hourlyRate: seed,
                      });
                    }}
                    value={
                      currentStaff.baseRateMode === 'custom'
                        ? currentStaff.hourlyRate > 0
                          ? currentStaff.hourlyRate
                          : ''
                        : ''
                    }
                    onValueChange={(value) =>
                      setStaffDraft({
                        ...currentStaff,
                        baseRateMode: 'custom',
                        hourlyRate: value === null ? 0 : value,
                      })
                    }
                    placeholder={
                      (rules.defaultHourlyRate ?? 0) > 0
                        ? String(rules.defaultHourlyRate)
                        : '0.00'
                    }
                    defaultOptionLabel="Default"
                  />
                  {currentStaff.baseRateMode === 'default' ? (
                    <p className="mt-1 text-[11px] text-subtle">
                      {(rules.defaultHourlyRate ?? 0) > 0
                        ? `Inherits ${formatMoney(rules.defaultHourlyRate ?? 0)}/h from company defaults — % loadings multiply against that base.`
                        : 'Set a company default hourly rate under Defaults, or choose Edit for this employee.'}
                    </p>
                  ) : null}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Effective from</span>
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={currentStaff.payRates.effectiveFrom ?? ''}
                    onChange={(event) =>
                      setStaffDraft({
                        ...currentStaff,
                        payRates: {
                          ...currentStaff.payRates,
                          effectiveFrom: event.target.value || undefined,
                        },
                      })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block sm:col-span-3">
                  <span className="mb-1 block text-xs text-subtle">Copy from</span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <select
                      value={copyFromId}
                      onChange={(event) => setCopyFromId(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select staff</option>
                      {staff
                        .filter((item) => item.id !== selectedStaff.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!copyFromId || !canEdit}
                      onClick={() => void copyFrom()}
                      className="rounded-lg border border-border px-3 py-2 text-xs text-muted disabled:opacity-50 sm:whitespace-nowrap"
                    >
                      Copy
                    </button>
                  </div>
                </label>
              </div>

              <div className="mt-5">
                <RateMatrixEditor
                  rules={rules}
                  cells={currentStaff.payRates.cells}
                  disabled={!canEdit}
                  baseRateHint={effectiveHourlyRate(
                    currentStaff.baseRateMode === 'custom'
                      ? currentStaff.hourlyRate
                      : 0,
                    rules,
                  )}
                  emptyHint="Choose Default to inherit the company matrix, or Edit to set a custom value for this band."
                  emptyCellLabel="Default"
                  onChange={(cells) =>
                    setStaffDraft({
                      ...currentStaff,
                      payRates: { ...currentStaff.payRates, cells },
                    })
                  }
                />
              </div>

              {canEdit ? (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveStaff()}
                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 sm:w-auto sm:px-6"
                  >
                    {saving ? 'Saving…' : `Save rates for ${selectedStaff.name}`}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {side === 'sites' ? (
        <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
          {locations.length === 0 ? (
            <p className="text-sm text-subtle">No locations yet.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Client</span>
                  <select
                    value={selectedSite?.id ?? ''}
                    onChange={(event) => {
                      setSiteId(event.target.value);
                      setSiteDraft(null);
                    }}
                    className={inputClass}
                  >
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Min charge hours</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    disabled={!canEdit}
                    placeholder={`${rules.minChargeHours} (company default)`}
                    value={currentSite.minChargeHours ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setSiteDraft({
                        ...currentSite,
                        minChargeHours: raw === '' ? null : Number(raw) || 0,
                      });
                    }}
                    className={inputClass}
                  />
                  {currentSite.minChargeHours == null ? (
                    <p className="mt-1 text-[11px] text-subtle">
                      Inherits {rules.minChargeHours} h from company defaults.
                    </p>
                  ) : null}
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Effective from</span>
                  <input
                    type="date"
                    disabled={!canEdit}
                    value={currentSite.effectiveFrom ?? ''}
                    onChange={(event) =>
                      setSiteDraft({
                        ...currentSite,
                        effectiveFrom: event.target.value || undefined,
                      })
                    }
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="mt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">
                  Client time bands
                </h3>
                <p className="mt-1 text-xs text-subtle">
                  Leave empty to inherit company bands (Settings → Pay and charge rules → Time
                  bands). Set early morning here per client if needed (e.g. 02:00–05:00 or
                  01:00–08:00). Overnight bands can wrap (e.g. 22:00–06:00).
                </p>
                <SiteTimeBandsEditor
                  bands={currentSite.timeBands ?? []}
                  disabled={!canEdit}
                  onChange={(timeBands) => setSiteDraft({ ...currentSite, timeBands })}
                />
              </div>

              <div className="mt-5">
                <RateMatrixEditor
                  rules={rules}
                  cells={currentSite.cells}
                  disabled={!canEdit}
                  emptyHint="Empty inherits the company charge matrix, then the staff weekday base."
                  emptyCellLabel="Default"
                  onChange={(cells) => setSiteDraft({ ...currentSite, cells })}
                />
              </div>

              {canEdit ? (
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveSite()}
                    className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
                  >
                    {saving ? 'Saving…' : 'Save site billing'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {side === 'company' ? (
        <section className="min-w-0 space-y-6 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
          <div className="rounded-xl border border-border/70 bg-surface-base/30 p-4">
            <h2 className="text-sm font-semibold text-white">Company defaults</h2>
            <p className="mt-1 text-xs text-subtle">
              Base rate and minimum hours for staff and clients that leave those fields on
              Default. Nothing here is hidden — set the numbers you want applied company-wide.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs text-subtle">
                  Default hourly rate ($ / h)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  disabled={!canEditRules}
                  value={companyHourlyRate ?? rules.defaultHourlyRate ?? ''}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setCompanyHourlyRate(raw === '' ? 0 : Number(raw) || 0);
                  }}
                  placeholder="0.00"
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-subtle">
                  % loadings multiply against this when staff rate is Default.
                </p>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-subtle">Min pay hours</span>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  disabled={!canEditRules}
                  value={companyMinPayHours ?? rules.minPayHours}
                  onChange={(event) =>
                    setCompanyMinPayHours(Number(event.target.value) || 0)
                  }
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-subtle">
                  Inherited by staff when Min pay hours is empty. 0 turns it off.
                </p>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-subtle">Min charge hours</span>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  disabled={!canEditRules}
                  value={companyMinChargeHours ?? rules.minChargeHours}
                  onChange={(event) =>
                    setCompanyMinChargeHours(Number(event.target.value) || 0)
                  }
                  className={inputClass}
                />
                <p className="mt-1 text-[11px] text-subtle">
                  Inherited by clients when Min charge hours is empty. 0 turns it off.
                </p>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-subtle">Minimum applies per</span>
                <select
                  disabled={!canEditRules}
                  value={companyMinHoursScope ?? rules.minHoursScope}
                  onChange={(event) =>
                    setCompanyMinHoursScope(
                      event.target.value === 'day' ? 'day' : 'session',
                    )
                  }
                  className={inputClass}
                >
                  <option value="session">Session</option>
                  <option value="day">Day</option>
                </select>
              </label>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">Default pay matrix</h2>
            <p className="mt-1 text-xs text-subtle">
              Loadings (% of the default hourly rate, or a fixed $). Used when staff have no
              cell override for that day and band.
            </p>
            <div className="mt-3">
              <RateMatrixEditor
                rules={rules}
                cells={companyPay ?? rules.defaultPayCells}
                disabled={!canEditRules}
                editingMode="defaults"
                onChange={setCompanyPay}
              />
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Default charge matrix</h2>
            <p className="mt-1 text-xs text-subtle">
              Charge loadings for clients. Override per site when a customer has different rates.
            </p>
            <div className="mt-3">
              <RateMatrixEditor
                rules={rules}
                cells={companyCharge ?? rules.defaultChargeCells}
                disabled={!canEditRules}
                editingMode="defaults"
                onChange={setCompanyCharge}
              />
            </div>
          </div>
          {canEditRules ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveCompanyDefaults()}
              className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              {saving ? 'Saving…' : 'Save company defaults'}
            </button>
          ) : (
            <p className="text-xs text-subtle">You need permission to edit pay rules to change company defaults.</p>
          )}
        </section>
      ) : null}

      {error ? <FormAlert variant="error">{error}</FormAlert> : null}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function SiteTimeBandsEditor({
  bands,
  disabled,
  onChange,
}: {
  bands: PayTimeBand[];
  disabled: boolean;
  onChange: (bands: PayTimeBand[]) => void;
}) {
  return (
    <div className="mt-3 space-y-2">
      {bands.map((band, index) => (
        <div key={band.id} className="grid gap-2 sm:grid-cols-4">
          <input
            disabled={disabled}
            value={band.name}
            onChange={(event) => {
              const next = [...bands];
              next[index] = { ...band, name: event.target.value };
              onChange(next);
            }}
            className={inputClass}
            placeholder="Name"
          />
          <input
            disabled={disabled}
            value={band.from}
            onChange={(event) => {
              const next = [...bands];
              next[index] = { ...band, from: event.target.value };
              onChange(next);
            }}
            className={inputClass}
            placeholder="00:00"
          />
          <input
            disabled={disabled}
            value={band.to}
            onChange={(event) => {
              const next = [...bands];
              next[index] = { ...band, to: event.target.value };
              onChange(next);
            }}
            className={inputClass}
            placeholder="24:00"
          />
          {disabled ? null : (
            <button
              type="button"
              onClick={() => onChange(bands.filter((item) => item.id !== band.id))}
              className="text-xs text-rose-400 hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {disabled ? null : (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...bands,
              { id: newId('band'), name: 'Client band', from: '00:00', to: '06:00' },
            ])
          }
          className="text-xs font-medium text-primary hover:underline"
        >
          Add site band
        </button>
      )}
    </div>
  );
}
