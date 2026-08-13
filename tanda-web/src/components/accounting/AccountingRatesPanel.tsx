'use client';

import { useMemo, useState } from 'react';
import { RateMatrixEditor } from '@/components/accounting/RateMatrixEditor';
import {
  bulkSaveStaffRatesRequest,
  savePayRulesRequest,
  saveSiteBillingRequest,
  saveStaffRatesRequest,
} from '@/lib/accounting/accounting-api';
import { isPayrollEligibleEmployee } from '@/lib/employees/is-payroll-eligible-employee';
import { withSyncedBaseRate } from '@/lib/payroll/rate-matrix';
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copyFromId, setCopyFromId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [newCardDate, setNewCardDate] = useState('');
  const [siteNewCardDate, setSiteNewCardDate] = useState('');

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

  const currentStaff =
    staffDraft && staffId === staffKey
      ? staffDraft
      : selectedStaff
        ? {
            employmentTypeId:
              selectedStaff.employmentTypeId || rules.employmentTypes[0]?.id || 'employee',
            payRates: selectedStaff.payRates ?? {},
            hourlyRate: selectedStaff.hourlyRate || 0,
          }
        : null;

  const currentSite = siteDraft && siteId === siteKey ? siteDraft : selectedSite?.billing ?? {};

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
      setMessage(`Saved rates for ${selectedStaff.name}.`);
      setNewCardDate('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save staff rates.');
    } finally {
      setSaving(false);
    }
  }

  async function saveNewStaffCard() {
    if (!selectedStaff || !currentStaff || !newCardDate || !canEdit) return;
    const previous = selectedStaff.payRates;
    const history = [...(selectedStaff.payRateHistory ?? [])];
    if (previous && (previous.cells || previous.effectiveFrom)) {
      history.push(previous);
    }
    const nextDraft = {
      ...currentStaff,
      payRates: { ...currentStaff.payRates, effectiveFrom: newCardDate },
    };
    setStaffDraft(nextDraft);
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payRates = withSyncedBaseRate(nextDraft.payRates, nextDraft.hourlyRate);
      await saveStaffRatesRequest({
        employeeDocId: selectedStaff.id,
        employmentTypeId: nextDraft.employmentTypeId,
        payRates,
        hourlyRate: nextDraft.hourlyRate,
        payRateHistory: history,
      });
      await onStaffSaved();
      setMessage(`Saved new rate card for ${selectedStaff.name} from ${newCardDate}.`);
      setNewCardDate('');
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
      setMessage(`Saved billing for ${selectedSite.name}.`);
      setSiteNewCardDate('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save site billing.');
    } finally {
      setSaving(false);
    }
  }

  async function saveNewSiteCard() {
    if (!selectedSite || !siteNewCardDate || !canEdit) return;
    const previous = selectedSite.billing;
    const history = [...(selectedSite.billingHistory ?? [])];
    if (previous && (previous.cells || previous.effectiveFrom || previous.timeBands)) {
      history.push(previous);
    }
    const nextBilling = { ...currentSite, effectiveFrom: siteNewCardDate };
    setSiteDraft(nextBilling);
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveSiteBillingRequest({
        locationId: selectedSite.id,
        billing: nextBilling,
        billingHistory: history,
      });
      await onSiteSaved();
      setMessage(`Saved new billing card for ${selectedSite.name} from ${siteNewCardDate}.`);
      setSiteNewCardDate('');
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
  }

  async function applyToSelected() {
    if (!currentStaff || selectedIds.length === 0 || !canEdit) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payRates = withSyncedBaseRate(currentStaff.payRates, currentStaff.hourlyRate);
      await bulkSaveStaffRatesRequest({
        ids: selectedIds,
        employmentTypeId: currentStaff.employmentTypeId,
        payRates,
        hourlyRate: currentStaff.hourlyRate,
      });
      await onStaffSaved();
      setMessage(`Applied rates to ${selectedIds.length} staff.`);
      setSelectedIds([]);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Could not apply rates.');
    } finally {
      setSaving(false);
    }
  }

  async function saveAsTemplate() {
    if (!canEditRules || !currentStaff) return;
    const name = window.prompt('Template name');
    if (!name?.trim()) return;
    setSaving(true);
    setError('');
    try {
      const template: RateTemplate = {
        id: newId('tpl'),
        name: name.trim(),
        employmentTypeId: currentStaff.employmentTypeId,
        cells: currentStaff.payRates.cells,
        minPayHours: currentStaff.payRates.minPayHours,
      };
      await savePayRulesRequest({
        ...rules,
        rateTemplates: [...templates, template],
      });
      await onRulesSaved();
      setMessage(`Saved template “${template.name}”.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save template.');
    } finally {
      setSaving(false);
    }
  }

  async function applyTemplate(template: RateTemplate) {
    if (!currentStaff) return;
    setStaffDraft({
      ...currentStaff,
      employmentTypeId: template.employmentTypeId || currentStaff.employmentTypeId,
      payRates: {
        ...currentStaff.payRates,
        cells: template.cells,
        minPayHours: template.minPayHours,
      },
    });
    setMessage(`Loaded template “${template.name}”. Save or apply to selected.`);
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
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save company defaults.');
    } finally {
      setSaving(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const counts = useMemo(() => {
    const result = { none: 0, hourly: 0, template: 0, custom: 0 };
    for (const employee of staff) {
      result[staffRateKind(employee, templates)] += 1;
    }
    return result;
  }, [staff, templates]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(
          [
            ['staff', 'Staff'],
            ['sites', 'Sites'],
            ['company', 'Company defaults'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSide(id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              side === id
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {side === 'staff' ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
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
                    className={`rounded-full border px-3 py-1 text-xs ${
                      filter === id
                        ? 'border-primary/50 bg-primary/15 text-primary'
                        : 'border-border text-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="space-y-2">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search staff"
                    className={inputClass}
                  />
                  <ul className="max-h-80 overflow-y-auto rounded-xl border border-border/60">
                    {filteredStaff.map((employee) => (
                      <li key={employee.id} className="flex items-center gap-2 px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(employee.id)}
                          onChange={() => toggleSelected(employee.id)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setStaffId(employee.id);
                            setStaffDraft(null);
                          }}
                          className={`flex-1 truncate text-left text-sm ${
                            selectedStaff?.id === employee.id
                              ? 'font-medium text-primary'
                              : 'text-muted'
                          }`}
                        >
                          {employee.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  {currentStaff && selectedStaff ? (
                    <>
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
                        <label className="block">
                          <span className="mb-1 block text-xs text-subtle">Base hourly rate ($)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!canEdit}
                            value={currentStaff.hourlyRate || ''}
                            onChange={(event) =>
                              setStaffDraft({
                                ...currentStaff,
                                hourlyRate: Number(event.target.value) || 0,
                              })
                            }
                            className={inputClass}
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
                        <label className="block">
                          <span className="mb-1 block text-xs text-subtle">Copy from</span>
                          <div className="flex gap-2">
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
                              className="whitespace-nowrap rounded-lg border border-border px-3 text-xs text-muted"
                            >
                              Copy
                            </button>
                          </div>
                        </label>
                      </div>

                      {templates.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {templates.map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              disabled={!canEdit}
                              onClick={() => applyTemplate(template)}
                              className="rounded-full border border-border px-3 py-1 text-xs text-muted"
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-5">
                        <RateMatrixEditor
                          rules={rules}
                          cells={currentStaff.payRates.cells}
                          disabled={!canEdit}
                          emptyHint="Empty inherits the company default matrix, then the base hourly rate."
                          onChange={(cells) =>
                            setStaffDraft({
                              ...currentStaff,
                              payRates: { ...currentStaff.payRates, cells },
                            })
                          }
                        />
                      </div>

                      {(selectedStaff.payRateHistory?.length ?? 0) > 0 ? (
                        <p className="mt-3 text-xs text-subtle">
                          {selectedStaff.payRateHistory!.length} previous card
                          {selectedStaff.payRateHistory!.length === 1 ? '' : 's'} kept. The engine
                          uses the latest card whose effective date is on or before the shift.
                        </p>
                      ) : null}

                      {canEdit ? (
                        <div className="mt-4 flex flex-wrap items-end gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveStaff()}
                            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {saving ? 'Saving…' : 'Save staff rates'}
                          </button>
                          <button
                            type="button"
                            disabled={saving || selectedIds.length === 0}
                            onClick={() => void applyToSelected()}
                            className="rounded-lg border border-border px-4 py-2 text-sm text-muted disabled:opacity-50"
                          >
                            Apply to selected ({selectedIds.length})
                          </button>
                          {canEditRules ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void saveAsTemplate()}
                              className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
                            >
                              Save as template
                            </button>
                          ) : null}
                          <label className="flex items-center gap-2 text-xs text-subtle">
                            New card from
                            <input
                              type="date"
                              value={newCardDate}
                              onChange={(event) => setNewCardDate(event.target.value)}
                              className={inputClass}
                            />
                          </label>
                          <button
                            type="button"
                            disabled={!newCardDate || saving}
                            onClick={() => void saveNewStaffCard()}
                            className="rounded-lg border border-border px-3 py-2 text-xs text-muted disabled:opacity-50"
                          >
                            Keep previous card
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
        <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
          {locations.length === 0 ? (
            <p className="text-sm text-subtle">No locations yet.</p>
          ) : (
            <>
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
                  onChange={(cells) => setSiteDraft({ ...currentSite, cells })}
                />
              </div>

              {(selectedSite?.billingHistory?.length ?? 0) > 0 ? (
                <p className="mt-3 text-xs text-subtle">
                  {selectedSite!.billingHistory!.length} previous billing card
                  {selectedSite!.billingHistory!.length === 1 ? '' : 's'} kept.
                </p>
              ) : null}

              {canEdit ? (
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveSite()}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save site billing'}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-subtle">
                    New card from
                    <input
                      type="date"
                      value={siteNewCardDate}
                      onChange={(event) => setSiteNewCardDate(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!siteNewCardDate || saving}
                    onClick={() => void saveNewSiteCard()}
                    className="rounded-lg border border-border px-3 py-2 text-xs text-muted disabled:opacity-50"
                  >
                    Keep previous card
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {side === 'company' ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-white">Default pay matrix</h2>
            <p className="mt-1 text-xs text-subtle">
              Used when a staff member has no cell for that day and band, before falling back to
              their hourly rate.
            </p>
            <div className="mt-3">
              <RateMatrixEditor
                rules={rules}
                cells={companyPay ?? rules.defaultPayCells}
                disabled={!canEditRules}
                onChange={setCompanyPay}
              />
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Default charge matrix</h2>
            <p className="mt-1 text-xs text-subtle">
              Used when a site has no charge cell, before falling back to the weekday base.
            </p>
            <div className="mt-3">
              <RateMatrixEditor
                rules={rules}
                cells={companyCharge ?? rules.defaultChargeCells}
                disabled={!canEditRules}
                onChange={setCompanyCharge}
              />
            </div>
          </div>
          {canEditRules ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveCompanyDefaults()}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save company defaults'}
            </button>
          ) : (
            <p className="text-xs text-subtle">You need permission to edit pay rules to change company defaults.</p>
          )}
        </section>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
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
