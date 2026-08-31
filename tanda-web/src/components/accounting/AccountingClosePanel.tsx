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
import {
  downloadXeroBillsCsv,
  downloadXeroSalesInvoiceCsv,
} from '@/lib/payroll/xero-export';
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
        timeZone: timeZone,
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
      {/* Zone 1: Period + close status */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1">
          <PayrollPeriodFilterBar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            preset={preset}
            onPresetChange={setPreset}
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              frozen
                ? 'bg-amber-500/15 text-amber-300'
                : 'bg-emerald-500/15 text-emerald-300'
            }`}
          >
            {frozen ? 'Closed' : 'Open'}
          </span>
        </div>
      </div>

      {frozen ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <strong>Figures are frozen.</strong>{' '}
          {lock?.lockedBy ? `Closed by ${lock.lockedBy}` : ''}
          {lock?.lockedAt
            ? ` on ${new Date(lock.lockedAt).toLocaleString('en-AU')}`
            : ''}
          . New clock events won't change these numbers until you reopen.
        </div>
      ) : null}

      {/* Zone 2: Week summary KPIs */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Total pay" value={formatDashboardCurrency(report.totals.payAmount, currency)} hint="Staff cost" />
        <Kpi label="Total charge" value={formatDashboardCurrency(report.totals.chargeAmount, currency)} hint="Client revenue" />
        <Kpi label="Margin" value={formatDashboardCurrency(report.totals.margin, currency)} hint="Charge minus pay" />
        <Kpi
          label="Exceptions"
          value={String(exceptions.length)}
          hint={exceptions.length === 0 ? 'All clear' : 'Review before closing'}
          accent={exceptions.length > 0 ? 'warning' : undefined}
        />
      </div>

      {/* Zone 3: Exceptions to review (priority) */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Exceptions to review</h2>
            <p className="mt-0.5 text-xs text-subtle">
              Resolve these before closing. Click any row for a detailed breakdown of what happened and why.
            </p>
          </div>
          {exceptions.length > 0 ? (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
              {exceptions.length}
            </span>
          ) : null}
        </div>
        {exceptions.length === 0 ? (
          <p className="mt-4 text-sm text-subtle">No exceptions — this week looks clean.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
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

      {/* Zone 4: Totals by site/staff */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Breakdown</h2>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setGroupBy('site')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                groupBy === 'site'
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border text-muted'
              }`}
            >
              By site
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('staff')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                groupBy === 'staff'
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border text-muted'
              }`}
            >
              By staff
            </button>
          </div>
        </div>

        {loading ? <p className="text-sm text-subtle">Loading period…</p> : null}

        <div className="overflow-hidden rounded-xl border border-border">
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
                    No award hours in this period. Check that staff have clocked in, or adjust the date range.
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
      </section>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-raised p-4">
        {canLock && !frozen ? (
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void handleLock()}
            className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
          >
            {busy ? 'Closing…' : 'Close week'}
          </button>
        ) : null}
        {canUnlock && frozen ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleUnlock()}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground"
          >
            {busy ? 'Reopening…' : 'Reopen week'}
          </button>
        ) : null}
        {canExport ? (
          <>
            <button
              type="button"
              onClick={() =>
                downloadXeroSalesInvoiceCsv({
                  report,
                  rules,
                  periodLabel,
                  periodStart: dateRange.start,
                  periodEnd: dateRange.end,
                })
              }
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              Export Xero sales invoices
            </button>
            <button
              type="button"
              onClick={() =>
                downloadXeroBillsCsv({
                  slices: report.slices,
                  rules,
                  periodLabel,
                  periodStart: dateRange.start,
                  periodEnd: dateRange.end,
                })
              }
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              Export Xero bills
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
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              Export charge pack
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
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              Export journal
            </button>
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
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
            >
              Download summary CSV
            </button>
          </>
        ) : null}
        {!canLock && !canExport ? (
          <p className="text-sm text-subtle">You don't have permission to close or export.</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

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

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: 'warning' }) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${accent === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-surface-raised'}`}>
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}
