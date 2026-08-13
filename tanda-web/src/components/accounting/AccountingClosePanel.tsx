'use client';

import { useMemo, useState } from 'react';
import { AwardSessionDetail } from '@/components/accounting/AwardSessionDetail';
import {
  PayrollPeriodFilterBar,
  type PayrollPeriodPreset,
} from '@/components/payroll/PayrollPeriodFilterBar';
import { useAccountingPeriod } from '@/hooks/useAccountingPeriod';
import {
  lockPeriodRequest,
  unlockPeriodRequest,
} from '@/lib/accounting/accounting-api';
import {
  formatPayPeriodLabel,
  getLastWeekRange,
  type DateRange,
} from '@/lib/attendance/date-range';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import { isPayrollEligibleEmployee } from '@/lib/employees/is-payroll-eligible-employee';
import {
  buildAwardExceptions,
  buildAwardReport,
  groupAwardSlices,
  type AwardException,
  type AwardIncompleteSession,
  type AwardSessionLine,
} from '@/lib/payroll/award-calc';
import {
  buildSiteChargePacks,
  exportAccountingViewToCsv,
} from '@/lib/payroll/award-export';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import type { AttendanceBreakSettings } from '@/lib/types/company-settings';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type { PayRules } from '@/lib/types/pay-rules';

const EXCEPTION_LABEL: Record<AwardException['kind'], string> = {
  incomplete: 'Incomplete',
  min_pay: 'Min pay',
  min_charge: 'Min charge',
  overtime: 'Overtime',
  fallback_rate: 'Fallback rate',
  missing_site_card: 'No site card',
};

interface AccountingClosePanelProps {
  rules: PayRules;
  timeZone: string;
  currency: string;
  attendanceBreak: AttendanceBreakSettings;
  employees: Employee[];
  locations: Location[];
  canExport: boolean;
  canLock: boolean;
  canUnlock: boolean;
}

export function AccountingClosePanel({
  rules,
  timeZone,
  currency,
  attendanceBreak,
  employees,
  locations,
  canExport,
  canLock,
  canUnlock,
}: AccountingClosePanelProps) {
  const [dateRange, setDateRange] = useState<DateRange>(() => getLastWeekRange());
  const [preset, setPreset] = useState<PayrollPeriodPreset>('last-week');
  const [groupBy, setGroupBy] = useState<'site' | 'staff'>('site');
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { sessions, shifts, leaveRequests, lock, setLock, loading } = useAccountingPeriod(
    dateRange,
    attendanceBreak,
  );

  const staff = useMemo(() => employees.filter(isPayrollEligibleEmployee), [employees]);

  const liveReport = useMemo(
    () =>
      buildAwardReport({
        rules,
        timeZone,
        employees: staff,
        locations,
        sessions,
        shifts,
        dateRange,
        leaveRequests,
      }),
    [rules, timeZone, staff, locations, sessions, shifts, dateRange, leaveRequests],
  );

  const report = lock?.snapshot ?? liveReport;
  const frozen = Boolean(lock);
  const exceptions = useMemo(() => buildAwardExceptions(report), [report]);
  const grouped = useMemo(() => groupAwardSlices(report.slices, groupBy), [report.slices, groupBy]);
  const packs = useMemo(() => buildSiteChargePacks({ report, rules }), [report, rules]);
  const periodLabel = formatPayPeriodLabel(dateRange);

  const selectedLine: AwardSessionLine | null =
    report.sessions.find((line) => line.sessionKey === detailKey) ?? null;
  const selectedIncomplete: AwardIncompleteSession | null =
    report.incomplete.find((item) => item.sessionKey === detailKey) ?? null;
  const selectedSlices = report.slices.filter((slice) => slice.sessionKey === detailKey);

  async function handleLock() {
    if (!canLock || frozen) return;
    setBusy(true);
    setError('');
    try {
      const next = await lockPeriodRequest({
        start: dateRange.start,
        end: dateRange.end,
        snapshot: liveReport,
      });
      setLock(next);
    } catch (lockError) {
      setError(lockError instanceof Error ? lockError.message : 'Could not close this week.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock() {
    if (!canUnlock || !frozen) return;
    setBusy(true);
    setError('');
    try {
      await unlockPeriodRequest({ start: dateRange.start, end: dateRange.end });
      setLock(null);
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : 'Could not reopen this week.');
    } finally {
      setBusy(false);
    }
  }

  function openException(item: AwardException) {
    setDetailKey(item.sessionKey);
  }

  return (
    <div className="space-y-5">
      <PayrollPeriodFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        preset={preset}
        onPresetChange={setPreset}
      />

      {frozen ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Week closed — figures frozen
          {lock?.lockedBy ? ` by ${lock.lockedBy}` : ''}
          {lock?.lockedAt
            ? ` on ${new Date(lock.lockedAt).toLocaleString('en-AU')}`
            : ''}
          . Kiosk punches still work; they will not change these numbers until you reopen.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Pay" value={formatDashboardCurrency(report.totals.payAmount, currency)} />
        <Kpi label="Charge" value={formatDashboardCurrency(report.totals.chargeAmount, currency)} />
        <Kpi label="Margin" value={formatDashboardCurrency(report.totals.margin, currency)} />
        <Kpi label="Exceptions" value={String(exceptions.length)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setGroupBy('site')}
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            groupBy === 'site'
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-border text-muted'
          }`}
        >
          By site (charge)
        </button>
        <button
          type="button"
          onClick={() => setGroupBy('staff')}
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            groupBy === 'staff'
              ? 'border-primary/50 bg-primary/15 text-primary'
              : 'border-border text-muted'
          }`}
        >
          By staff (pay)
        </button>
        {canExport ? (
          <>
            <button
              type="button"
              onClick={() =>
                exportAccountingViewToCsv({
                  view: groupBy === 'site' ? 'charge' : 'pay',
                  groupBy,
                  report,
                  slices: report.slices,
                  rules,
                  periodLabel,
                  periodStart: dateRange.start,
                  periodEnd: dateRange.end,
                  companyName: COMPANY_NAME,
                })
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Download CSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportAccountingViewToCsv({
                  view: 'chargePack',
                  groupBy: 'site',
                  report,
                  slices: report.slices,
                  rules,
                  periodLabel,
                  periodStart: dateRange.start,
                  periodEnd: dateRange.end,
                  companyName: COMPANY_NAME,
                })
              }
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
            >
              Charge pack CSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportAccountingViewToCsv({
                  view: 'journal',
                  groupBy: 'staff',
                  report,
                  slices: report.slices,
                  rules,
                  periodLabel,
                  periodStart: dateRange.start,
                  periodEnd: dateRange.end,
                  companyName: COMPANY_NAME,
                })
              }
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
            >
              Journal CSV
            </button>
          </>
        ) : null}
        {canLock && !frozen ? (
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void handleLock()}
            className="rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-200"
          >
            {busy ? 'Closing…' : 'Close week'}
          </button>
        ) : null}
        {canUnlock && frozen ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleUnlock()}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
          >
            {busy ? 'Reopening…' : 'Reopen week'}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {loading ? <p className="text-sm text-subtle">Loading period…</p> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-primary/25 bg-primary/10">
              <th className="px-4 py-3 font-semibold text-white">
                {groupBy === 'site' ? 'Site' : 'Staff'}
              </th>
              <th className="px-4 py-3 font-semibold text-white">Hours</th>
              <th className="px-4 py-3 font-semibold text-white">Pay</th>
              <th className="px-4 py-3 font-semibold text-white">Charge</th>
              <th className="px-4 py-3 font-semibold text-white">Margin</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-subtle">
                  No award hours in this period.
                </td>
              </tr>
            ) : (
              grouped.map((row) => (
                <tr key={row.key} className="border-b border-border/50">
                  <td className="px-4 py-3 text-foreground">{row.label}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {(groupBy === 'site' ? row.chargeHours : row.payHours).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {formatDashboardCurrency(row.payAmount, currency)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {formatDashboardCurrency(row.chargeAmount, currency)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {formatDashboardCurrency(row.margin, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-white">Exceptions</h2>
        <p className="mt-1 text-xs text-subtle">Click a row to see clock vs billable vs min.</p>
        {exceptions.length === 0 ? (
          <p className="mt-3 text-sm text-subtle">No exceptions in this period.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/60">
            {exceptions.map((item) => (
              <li key={`${item.kind}|${item.sessionKey}|${item.detail}`}>
                <button
                  type="button"
                  onClick={() => openException(item)}
                  className="flex w-full flex-col gap-0.5 px-1 py-3 text-left hover:bg-surface-hover/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm text-foreground">
                    <span className="mr-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {EXCEPTION_LABEL[item.kind]}
                    </span>
                    {item.employeeName}
                    {item.locationName ? ` · ${item.locationName}` : ''}
                  </span>
                  <span className="text-xs text-muted">
                    {item.date} — {item.detail}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {groupBy === 'site' && packs.length > 0 ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-5">
          <h2 className="text-sm font-semibold text-white">Charge pack</h2>
          <div className="mt-3 space-y-4">
            {packs.map((pack) => (
              <div key={pack.locationId} className="rounded-xl border border-border/60 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-white">{pack.locationName}</p>
                  <p className="text-sm tabular-nums text-foreground">
                    {formatDashboardCurrency(pack.amount, currency)}
                    <span className="ml-2 text-xs text-subtle">
                      {pack.hours.toFixed(2)} h
                      {pack.minHoursApplied > 0
                        ? ` · ${pack.minHoursApplied.toFixed(2)} min hours`
                        : ''}
                    </span>
                  </p>
                </div>
                <ul className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
                  {pack.bands.map((band) => (
                    <li key={`${band.dayTypeId}:${band.bandId}`}>
                      {band.dayTypeName} · {band.bandName}: {band.hours.toFixed(2)} h ·{' '}
                      {formatDashboardCurrency(band.amount, currency)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <AwardSessionDetail
        line={selectedLine}
        incomplete={selectedIncomplete}
        slices={selectedSlices}
        rules={rules}
        currency={currency}
        onClose={() => setDetailKey(null)}
      />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-4 py-3">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
