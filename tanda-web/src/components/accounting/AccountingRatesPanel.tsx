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
import { withSyncedBaseRate, baseHourlyRateFromCells } from '@/lib/payroll/rate-matrix';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type {
  PayRateCells,
  PayRules,
  PayTimeBand,
  RateTemplate,
  SiteBilling,
  StaffPayRates,
} from '@/lib/types/pay-rules';

const inputClass =
  'w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary';

type RateKind = 'none' | 'hourly' | 'template' | 'custom';
type StaffFilter = 'all' | RateKind;

function cellsKey(cells: PayRateCells | undefined): string {
  if (!cells) return '';
  return Object.keys(cells)
    .sort()
    .map((key) => `${key}:${cells[key]?.rate ?? ''}:${cells[key]?.percent ?? ''}`)
    .join('|');
}

function staffRateKind(employee: Employee, templates: RateTemplate[]): RateKind {
  const cells = employee.payRates?.cells;
  const hasCells = Boolean(cells && Object.keys(cells).length > 0);
  if (!hasCells) return employee.hourlyRate > 0 ? 'hourly' : 'none';
  const key = cellsKey(cells);
  if (templates.some((template) => cellsKey(template.cells) === key)) return 'template';
  return 'custom';
}

function staffInheritanceLabel(employee: Employee, templates: RateTemplate[]): string {
  const kind = staffRateKind(employee, templates);
  if (kind === 'none') return 'Using company default pay matrix';
  if (kind === 'hourly') return 'Using company defaults + base hourly rate';
  if (kind === 'template') return 'Using a copied rate card';
  return 'Using a custom pay card';
}

function siteUsesCompanyDefaults(billing: SiteBilling | undefined): boolean {
  return !billing?.cells && !billing?.timeBands?.length && billing?.minChargeHours == null;
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
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StaffFilter>('all');
  const [copyFromId, setCopyFromId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const templates = rules.rateTemplates ?? [];
  const staff = useMemo(() => employees.filter(isPayrollEligibleEmployee), [employees]);

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((employee) => {
      const kind = staffRateKind(employee, templates);
      if (filter !== 'all' && kind !== filter) return false;
      if (!q) return true;
      return (
        employee.name.toLowerCase().includes(q) ||
        employee.employeeId.toLowerCase().includes(q)
      );
    });
  }, [staff, search, filter, templates]);

  const selectedStaff = staff.find((item) => item.id === staffId) ?? filteredStaff[0] ?? staff[0];
  const selectedSite = locations.find((item) => item.id === siteId) ?? locations[0];

  const [staffDraft, setStaffDraft] = useState<{
    employmentTypeId: string;
    payRates: StaffPayRates;
    hourlyRate: number;
  } | null>(null);
  const [siteDraft, setSiteDraft] = useState<SiteBilling | null>(null);
  const [companyPay, setCompanyPay] = useState<PayRateCells | null>(null);
  const [companyCharge, setCompanyCharge] = useState<PayRateCells | null>(null);

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
        defaultPayCells: companyPay ?? rules.defaultPayCells,
        defaultChargeCells: companyCharge ?? rules.defaultChargeCells,
      });
      await onRulesSaved();
      setMessage('Saved company default matrices.');
      setToast({
        id: `company-defaults-saved-${Date.now()}`,
        text: 'Saved company default matrices.',
        variant: 'success',
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save company defaults.');
    } finally {
      setSaving(false);
    }
  }

  const counts = useMemo(() => {
    const result = { none: 0, hourly: 0, template: 0, custom: 0 };
    for (const employee of staff) {
      result[staffRateKind(employee, templates)] += 1;
    }
    return result;
  }, [staff, templates]);

  return (
    <div className="min-w-0 space-y-5">
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface-base/40 p-1 sm:flex sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0">
        {(
          [
            ['staff', 'Staff'],
            ['sites', 'Sites'],
            ['company', 'Defaults'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSide(id)}
            className={`rounded-lg px-2 py-2 text-center text-xs font-medium sm:border sm:px-3 sm:text-sm ${
              side === id
                ? 'bg-primary/15 text-primary sm:border-primary/50'
                : 'text-muted sm:border-border'
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
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all', `All (${staff.length})`],
                    ['none', `No rate card (${counts.none})`],
                    ['hourly', `Hourly rate only (${counts.hourly})`],
                    ['template', `From template (${counts.template})`],
                    ['custom', `Custom card (${counts.custom})`],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                      filter === id
                        ? 'border-primary/50 bg-primary/15 text-primary shadow-[0_0_0_1px_rgba(236,72,153,0.15)]'
                        : 'border-border bg-surface-base/40 text-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <label className="block md:hidden">
                    <span className="mb-1 block text-xs text-subtle">Employee</span>
                    <select
                      value={selectedStaff?.id ?? ''}
                      onChange={(event) => {
                        setStaffId(event.target.value);
                        setStaffDraft(null);
                      }}
                      className={inputClass}
                    >
                      {filteredStaff.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="hidden items-center gap-2 rounded-lg border border-border/60 bg-surface-base/30 px-3 py-2 text-xs text-muted md:flex">
                    <input
                      type="checkbox"
                      checked={filter === 'all'}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setFilter('all');
                        }
                      }}
                    />
                    All staff
                  </label>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or ID"
                    className={inputClass}
                  />
                  <ul className="hidden max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-surface-base/20 p-2 md:block">
                    {filteredStaff.map((employee) => (
                      <li key={employee.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setStaffId(employee.id);
                            setStaffDraft(null);
                          }}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                            selectedStaff?.id === employee.id
                              ? 'border-primary/50 bg-primary/10 text-white'
                              : 'border-border/60 bg-surface-base/30 text-muted hover:border-border hover:bg-surface-hover/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{employee.name}</p>
                              <p className="mt-1 text-xs text-subtle">
                                {employee.employeeId} · {staffInheritanceLabel(employee, templates)}
                              </p>
                            </div>
                            {selectedStaff?.id === employee.id ? (
                              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                Editing
                              </span>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="min-w-0">
                  {currentStaff && selectedStaff ? (
                    <>
                      <div className="mb-4 rounded-xl border border-border/70 bg-surface-base/30 p-4">
                        <p className="text-sm font-medium text-white">Pay side</p>
                        <p className="mt-1 text-xs text-subtle">
                          This section controls what you pay <span className="text-foreground">{selectedStaff.name}</span>.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                            {staffInheritanceLabel(selectedStaff, templates)}
                          </span>
                          {currentStaff.payRates.effectiveFrom ? (
                            <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
                              Effective from {currentStaff.payRates.effectiveFrom}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <label className="block sm:col-span-1">
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
                        <label className="block sm:col-span-2">
                          <span className="mb-1 block text-xs text-subtle">Base hourly rate ($)</span>
                          <OverrideValueField
                            disabled={!canEdit}
                            mode={currentStaff.hourlyRate > 0 ? 'custom' : 'default'}
                            onModeChange={(mode) => {
                              if (mode === 'default') {
                                setStaffDraft({
                                  ...currentStaff,
                                  hourlyRate: 0,
                                });
                                return;
                              }

                              const seed =
                                currentStaff.hourlyRate > 0
                                  ? currentStaff.hourlyRate
                                  : baseHourlyRateFromCells(currentStaff.payRates.cells, 0);

                              setStaffDraft({
                                ...currentStaff,
                                hourlyRate: seed,
                              });
                            }}
                            value={
                              currentStaff.hourlyRate > 0 ? currentStaff.hourlyRate : ''
                            }
                            onValueChange={(value) =>
                              setStaffDraft({
                                ...currentStaff,
                                hourlyRate: value === null ? 0 : value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-subtle">Min pay hours</span>
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            disabled={!canEdit}
                            placeholder="Inherits company default"
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
                        <label className="block sm:col-span-3 lg:col-span-1">
                          <span className="mb-1 block text-xs text-subtle">Copy from</span>
                          <div className="flex flex-col gap-2 sm:flex-row">
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
                          baseRateHint={currentStaff.hourlyRate}
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
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      {side === 'sites' ? (
        <section className="min-w-0 rounded-2xl border border-border bg-surface-raised p-4 md:p-6">
          {locations.length === 0 ? (
            <p className="text-sm text-subtle">No locations yet.</p>
          ) : (
            <>
              <div className="mb-4 rounded-xl border border-border/70 bg-surface-base/30 p-4">
                <p className="text-sm font-medium text-white">Charge side</p>
                <p className="mt-1 text-xs text-subtle">
                  This section controls what the client site pays you for worked hours at <span className="text-foreground">{selectedSite?.name}</span>.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                    {siteUsesCompanyDefaults(selectedSite?.billing)
                      ? 'Using company default charge matrix'
                      : 'Using a site-specific charge card'}
                  </span>
                  {currentSite.effectiveFrom ? (
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
                      Effective from {currentSite.effectiveFrom}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Site</span>
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
                    placeholder="Inherits company default"
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
                  Site time bands
                </h3>
                <p className="mt-1 text-xs text-subtle">
                  Leave empty to inherit company bands. Overnight bands can wrap (e.g. 22:00–06:00).
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
          <div>
            <h2 className="text-sm font-semibold text-white">Default pay matrix</h2>
            <p className="mt-1 text-xs text-subtle">
              Starting loadings (% of each person’s hourly rate). Used when staff have no cell for
              that day and band. Change the numbers to match your award.
            </p>
            <p className="mt-2 text-xs text-primary">
              Applies to all staff who do not have their own pay card override.
            </p>
            <div className="mt-3">
              <RateMatrixEditor
                rules={rules}
                cells={companyPay ?? rules.defaultPayCells}
                disabled={!canEditRules}
                emptyCellLabel="Base"
                onChange={setCompanyPay}
              />
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Default charge matrix</h2>
            <p className="mt-1 text-xs text-subtle">
              Starting charge loadings (% of the staff hourly rate), a bit above pay so margin is
              visible. Override per site when a customer has different rates.
            </p>
            <p className="mt-2 text-xs text-primary">
              Applies to all sites that do not have their own charge card override.
            </p>
            <div className="mt-3">
              <RateMatrixEditor
                rules={rules}
                cells={companyCharge ?? rules.defaultChargeCells}
                disabled={!canEditRules}
                emptyCellLabel="Base"
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
              { id: newId('band'), name: 'Site band', from: '00:00', to: '06:00' },
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
