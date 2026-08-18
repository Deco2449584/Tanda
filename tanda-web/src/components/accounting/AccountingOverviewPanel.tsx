'use client';

import { useMemo } from 'react';
import { useAccountingPeriod } from '@/hooks/useAccountingPeriod';
import { getLastWeekRange } from '@/lib/attendance/date-range';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import { isPayrollEligibleEmployee } from '@/lib/employees/is-payroll-eligible-employee';
import {
  buildAwardExceptions,
  buildAwardReport,
} from '@/lib/payroll/award-calc';
import type { AttendanceBreakSettings } from '@/lib/types/company-settings';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type { PayRules } from '@/lib/types/pay-rules';

type Tab = 'overview' | 'setup' | 'weekly-close' | 'exports';

interface AccountingOverviewPanelProps {
  rules: PayRules;
  timeZone: string;
  currency: string;
  attendanceBreak: AttendanceBreakSettings;
  employees: Employee[];
  locations: Location[];
  onNavigate: (tab: Tab) => void;
}

export function AccountingOverviewPanel({
  rules,
  timeZone,
  currency,
  attendanceBreak,
  employees,
  locations,
  onNavigate,
}: AccountingOverviewPanelProps) {
  const dateRange = useMemo(() => getLastWeekRange(), []);
  const { sessions, shifts, leaveRequests, lock, loading } = useAccountingPeriod(
    dateRange,
    attendanceBreak,
  );

  const staff = useMemo(() => employees.filter(isPayrollEligibleEmployee), [employees]);

  const report = useMemo(
    () =>
      lock?.snapshot ??
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
    [rules, timeZone, staff, locations, sessions, shifts, dateRange, leaveRequests, lock],
  );

  const exceptions = useMemo(() => buildAwardExceptions(report), [report]);
  const frozen = Boolean(lock);

  const staffWithoutCard = staff.filter(
    (emp) => !emp.payRates?.cells || Object.keys(emp.payRates.cells).length === 0,
  ).length;
  const sitesWithoutCard = locations.filter(
    (loc) => !loc.billing?.cells || Object.keys(loc.billing.cells).length === 0,
  ).length;

  const hasCompanyPay = Boolean(rules.defaultPayCells && Object.keys(rules.defaultPayCells).length > 0);
  const hasCompanyCharge = Boolean(rules.defaultChargeCells && Object.keys(rules.defaultChargeCells).length > 0);

  return (
    <div className="space-y-6">
      {loading ? (
        <p className="text-sm text-subtle">Loading last week's data...</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusCard
          label="Week status"
          value={frozen ? 'Closed' : 'Open'}
          hint={frozen ? 'Figures are frozen' : 'Ready for review'}
          accent={frozen ? 'amber' : 'green'}
        />
        <StatusCard label="Pay" value={formatDashboardCurrency(report.totals.payAmount, currency)} hint="Total staff cost" />
        <StatusCard label="Charge" value={formatDashboardCurrency(report.totals.chargeAmount, currency)} hint="Total billed to clients" />
        <StatusCard label="Margin" value={formatDashboardCurrency(report.totals.margin, currency)} hint="Charge minus pay" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="What needs attention"
          items={[
            exceptions.length > 0
              ? `${exceptions.length} exception${exceptions.length === 1 ? '' : 's'} to review`
              : null,
            report.incompleteSessions > 0
              ? `${report.incompleteSessions} incomplete session${report.incompleteSessions === 1 ? '' : 's'} (no check-out)`
              : null,
            !frozen ? 'Week is still open — close when ready' : null,
          ]}
          emptyMessage="Nothing needs attention right now."
          cta={exceptions.length > 0 || !frozen ? 'Go to Weekly close' : undefined}
          onAction={() => onNavigate('weekly-close')}
        />
        <ActionCard
          title="Configuration health"
          items={[
            !hasCompanyPay ? 'Company pay matrix is empty' : null,
            !hasCompanyCharge ? 'Company charge matrix is empty' : null,
            staffWithoutCard > 0
              ? `${staffWithoutCard} staff using company defaults (no personal card)`
              : null,
            sitesWithoutCard > 0
              ? `${sitesWithoutCard} site${sitesWithoutCard === 1 ? '' : 's'} without a charge card`
              : null,
          ]}
          emptyMessage="All configured. Staff and sites have rate cards."
          cta={(!hasCompanyPay || !hasCompanyCharge || sitesWithoutCard > 0) ? 'Go to Setup' : undefined}
          onAction={() => onNavigate('setup')}
        />
        <ActionCard
          title="Next step"
          items={[
            !frozen && exceptions.length === 0
              ? 'Review totals, then close the week'
              : null,
            !frozen && exceptions.length > 0
              ? 'Review exceptions before closing'
              : null,
            frozen ? 'Export journal and charge packs' : null,
          ]}
          emptyMessage="You're all set."
          cta={frozen ? 'Go to Exports' : 'Go to Weekly close'}
          onAction={() => onNavigate(frozen ? 'exports' : 'weekly-close')}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface-raised p-5">
        <h3 className="text-sm font-semibold text-white">How this module works</h3>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">1</span>
            <span><strong className="text-foreground">Setup</strong> — configure pay rules, time bands, and rate cards for staff and sites.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">2</span>
            <span><strong className="text-foreground">Weekly close</strong> — review pay, charge, margin and exceptions. Close the week to freeze numbers.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">3</span>
            <span><strong className="text-foreground">Exports</strong> — download journal entries, charge packs by site, and detailed timesheets.</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: 'amber' | 'green';
}) {
  const accentClass =
    accent === 'amber'
      ? 'border-amber-500/30 bg-amber-500/5'
      : accent === 'green'
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : 'border-border';
  return (
    <div className={`rounded-xl border p-4 ${accentClass}`}>
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function ActionCard({
  title,
  items,
  emptyMessage,
  cta,
  onAction,
}: {
  title: string;
  items: Array<string | null>;
  emptyMessage: string;
  cta?: string;
  onAction: () => void;
}) {
  const filtered = items.filter(Boolean) as string[];
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-raised p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {filtered.length === 0 ? (
        <p className="mt-2 flex-1 text-sm text-subtle">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 flex-1 space-y-1.5">
          {filtered.map((text) => (
            <li key={text} className="flex items-start gap-2 text-sm text-muted">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {text}
            </li>
          ))}
        </ul>
      )}
      {cta ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 self-start rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
        >
          {cta}
        </button>
      ) : null}
    </div>
  );
}
