'use client';

import { useMemo, useState } from 'react';
import { RateMatrixEditor } from '@/components/accounting/RateMatrixEditor';
import {
  saveSiteBillingRequest,
  saveStaffRatesRequest,
} from '@/lib/accounting/accounting-api';
import { isPayrollEligibleEmployee } from '@/lib/employees/is-payroll-eligible-employee';
import { withSyncedBaseRate } from '@/lib/payroll/rate-matrix';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type { PayRules, SiteBilling, StaffPayRates } from '@/lib/types/pay-rules';

const inputClass =
  'w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary';

interface AccountingRatesPanelProps {
  rules: PayRules;
  employees: Employee[];
  locations: Location[];
  canEdit: boolean;
  onStaffSaved: () => Promise<void> | void;
  onSiteSaved: () => Promise<void> | void;
}

export function AccountingRatesPanel({
  rules,
  employees,
  locations,
  canEdit,
  onStaffSaved,
  onSiteSaved,
}: AccountingRatesPanelProps) {
  const [side, setSide] = useState<'staff' | 'sites'>('staff');
  const [staffId, setStaffId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const staff = useMemo(
    () => employees.filter(isPayrollEligibleEmployee),
    [employees],
  );
  const selectedStaff = staff.find((item) => item.id === staffId) ?? staff[0];
  const selectedSite = locations.find((item) => item.id === siteId) ?? locations[0];

  const [staffDraft, setStaffDraft] = useState<{
    employmentTypeId: string;
    payRates: StaffPayRates;
    hourlyRate: number;
  } | null>(null);
  const [siteDraft, setSiteDraft] = useState<SiteBilling | null>(null);

  const staffKey = selectedStaff?.id ?? '';
  const siteKey = selectedSite?.id ?? '';

  const currentStaff = staffDraft && staffId === staffKey ? staffDraft : selectedStaff
    ? {
        employmentTypeId: selectedStaff.employmentTypeId || rules.employmentTypes[0]?.id || 'employee',
        payRates: selectedStaff.payRates ?? {},
        hourlyRate: selectedStaff.hourlyRate || 0,
      }
    : null;

  const currentSite = siteDraft && siteId === siteKey ? siteDraft : selectedSite?.billing ?? {};

  async function saveStaff() {
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
      });
      await onStaffSaved();
      setMessage(`Saved rates for ${selectedStaff.name}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save staff rates.');
    } finally {
      setSaving(false);
    }
  }

  async function saveSite() {
    if (!selectedSite || !canEdit) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveSiteBillingRequest({
        locationId: selectedSite.id,
        billing: currentSite,
      });
      await onSiteSaved();
      setMessage(`Saved billing for ${selectedSite.name}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save site billing.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSide('staff')}
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            side === 'staff'
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-border text-muted'
          }`}
        >
          Staff
        </button>
        <button
          type="button"
          onClick={() => setSide('sites')}
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            side === 'sites'
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-border text-muted'
          }`}
        >
          Sites
        </button>
      </div>

      {side === 'staff' ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-5 md:p-6">
          {staff.length === 0 ? (
            <p className="text-sm text-subtle">No payroll-eligible employees.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block sm:col-span-1">
                  <span className="mb-1 block text-xs text-subtle">Employee</span>
                  <select
                    value={selectedStaff?.id ?? ''}
                    onChange={(event) => {
                      setStaffId(event.target.value);
                      setStaffDraft(null);
                    }}
                    className={inputClass}
                  >
                    {staff.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} ({employee.employeeId})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Employment type</span>
                  <select
                    disabled={!canEdit}
                    value={currentStaff?.employmentTypeId ?? ''}
                    onChange={(event) =>
                      setStaffDraft({
                        employmentTypeId: event.target.value,
                        payRates: currentStaff?.payRates ?? {},
                        hourlyRate: currentStaff?.hourlyRate ?? 0,
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
                    value={currentStaff?.hourlyRate || ''}
                    onChange={(event) =>
                      setStaffDraft({
                        employmentTypeId: currentStaff?.employmentTypeId ?? 'employee',
                        payRates: currentStaff?.payRates ?? {},
                        hourlyRate: Number(event.target.value) || 0,
                      })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-subtle">Min pay hours override</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    disabled={!canEdit}
                    placeholder="Inherit"
                    value={currentStaff?.payRates.minPayHours ?? ''}
                    onChange={(event) => {
                      const raw = event.target.value;
                      setStaffDraft({
                        employmentTypeId: currentStaff?.employmentTypeId ?? 'employee',
                        hourlyRate: currentStaff?.hourlyRate ?? 0,
                        payRates: {
                          ...currentStaff?.payRates,
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
                    value={currentStaff?.payRates.effectiveFrom ?? ''}
                    onChange={(event) =>
                      setStaffDraft({
                        employmentTypeId: currentStaff?.employmentTypeId ?? 'employee',
                        hourlyRate: currentStaff?.hourlyRate ?? 0,
                        payRates: {
                          ...currentStaff?.payRates,
                          effectiveFrom: event.target.value || undefined,
                        },
                      })
                    }
                    className={inputClass}
                  />
                </label>
              </div>
              <div className="mt-5">
                <RateMatrixEditor
                  rules={rules}
                  cells={currentStaff?.payRates.cells}
                  disabled={!canEdit}
                  onChange={(cells) =>
                    setStaffDraft({
                      employmentTypeId: currentStaff?.employmentTypeId ?? 'employee',
                      hourlyRate: currentStaff?.hourlyRate ?? 0,
                      payRates: { ...currentStaff?.payRates, cells },
                    })
                  }
                />
              </div>
              {canEdit ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveStaff()}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save staff rates'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : (
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
                  <span className="mb-1 block text-xs text-subtle">Min charge hours override</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    disabled={!canEdit}
                    placeholder="Inherit"
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
                <RateMatrixEditor
                  rules={rules}
                  cells={currentSite.cells}
                  disabled={!canEdit}
                  emptyHint="Empty inherits the staff base rate for that day/band."
                  onChange={(cells) => setSiteDraft({ ...currentSite, cells })}
                />
              </div>
              {canEdit ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveSite()}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save site billing'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      )}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
    </div>
  );
}
