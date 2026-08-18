'use client';

import { useMemo, useState } from 'react';
import {
  PayrollPeriodFilterBar,
  type PayrollPeriodPreset,
} from '@/components/payroll/PayrollPeriodFilterBar';
import { useAccountingPeriod } from '@/hooks/useAccountingPeriod';
import { savePayRulesRequest } from '@/lib/accounting/accounting-api';
import {
  formatPayPeriodLabel,
  getLastWeekRange,
  type DateRange,
} from '@/lib/attendance/date-range';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import { isPayrollEligibleEmployee } from '@/lib/employees/is-payroll-eligible-employee';
import {
  bandDisplayName,
  buildAwardReport,
  dayTypeDisplayName,
  filterAwardSlices,
  groupAwardSlices,
  type AwardSlice,
} from '@/lib/payroll/award-calc';
import {
  buildAccountingJournalRows,
  buildSiteChargePacks,
  exportAccountingViewToCsv,
  type AccountingGroupBy,
  type AccountingJournalRow,
  type AccountingReportView,
  type SiteChargePack,
} from '@/lib/payroll/award-export';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import type { AttendanceBreakSettings } from '@/lib/types/company-settings';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type { AccountingReportPreset, PayRules } from '@/lib/types/pay-rules';

const inputClass =
  'w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary';

const VIEWS: Array<{ id: AccountingReportView; label: string }> = [
  { id: 'pay', label: 'Pay' },
  { id: 'charge', label: 'Charge' },
  { id: 'margin', label: 'Margin' },
  { id: 'timesheet', label: 'Timesheet' },
  { id: 'journal', label: 'Journal' },
  { id: 'chargePack', label: 'Charge pack' },
];

const GROUPS: Array<{ id: AccountingGroupBy; label: string }> = [
  { id: 'staff', label: 'Staff' },
  { id: 'site', label: 'Site' },
  { id: 'date', label: 'Day' },
  { id: 'band', label: 'Band' },
  { id: 'employmentType', label: 'Employment type' },
];

interface AccountingReportsPanelProps {
  rules: PayRules;
  timeZone: string;
  currency: string;
  attendanceBreak: AttendanceBreakSettings;
  employees: Employee[];
  locations: Location[];
  canExport: boolean;
  canEditRules: boolean;
  onPresetsSaved: () => Promise<void> | void;
}

export function AccountingReportsPanel({
  rules,
  timeZone,
  currency,
  attendanceBreak,
  employees,
  locations,
  canExport,
  canEditRules,
  onPresetsSaved,
}: AccountingReportsPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange>(() => getLastWeekRange());
  const [preset, setPreset] = useState<PayrollPeriodPreset>('last-week');
  const [view, setView] = useState<AccountingReportView>('pay');
  const [groupBy, setGroupBy] = useState<AccountingGroupBy>('staff');
  const [locationId, setLocationId] = useState('');
  const [employeeDocId, setEmployeeDocId] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentTypeId, setEmploymentTypeId] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);

  const { sessions, shifts, leaveRequests, lock, loading } = useAccountingPeriod(
    dateRange,
    attendanceBreak,
  );

  const staff = useMemo(() => employees.filter(isPayrollEligibleEmployee), [employees]);
  const departments = useMemo(
    () =>
      [...new Set(staff.map((item) => item.department).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [staff],
  );

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

  const slices = useMemo(
    () =>
      filterAwardSlices(report.slices, {
        locationId: locationId || undefined,
        employeeDocId: employeeDocId || undefined,
        department: department || undefined,
        employmentTypeId: employmentTypeId || undefined,
      }),
    [report.slices, locationId, employeeDocId, department, employmentTypeId],
  );

  const grouped = useMemo(() => groupAwardSlices(slices, groupBy), [slices, groupBy]);
  const journalRows = useMemo(
    () =>
      buildAccountingJournalRows({
        report: { ...report, slices },
        rules,
        periodLabel: formatPayPeriodLabel(dateRange),
        periodEnd: dateRange.end,
      }),
    [report, slices, rules, dateRange],
  );
  const packs = useMemo(
    () => buildSiteChargePacks({ report: { ...report, slices }, rules }),
    [report, slices, rules],
  );
  const periodLabel = formatPayPeriodLabel(dateRange);
  const presets = rules.reportPresets ?? [];

  function handleExport() {
    if (!canExport) return;
    exportAccountingViewToCsv({
      view,
      groupBy,
      report: { ...report, slices },
      slices,
      rules,
      periodLabel,
      periodStart: dateRange.start,
      periodEnd: dateRange.end,
      companyName: COMPANY_NAME,
    });
  }

  async function savePreset() {
    if (!canEditRules) return;
    const name = window.prompt('Preset name');
    if (!name?.trim()) return;
    setSavingPreset(true);
    try {
      const next: AccountingReportPreset[] = [
        ...presets.filter((item) => item.name !== name.trim()),
        {
          name: name.trim(),
          view,
          groupBy,
          locationId,
          employeeDocId,
          department,
          employmentTypeId,
        },
      ];
      await savePayRulesRequest({ ...rules, reportPresets: next });
      await onPresetsSaved();
    } finally {
      setSavingPreset(false);
    }
  }

  function applyPreset(item: AccountingReportPreset) {
    setView((item.view as AccountingReportView) || 'pay');
    setGroupBy((item.groupBy as AccountingGroupBy) || 'staff');
    setLocationId(item.locationId);
    setEmployeeDocId(item.employeeDocId);
    setDepartment(item.department);
    setEmploymentTypeId(item.employmentTypeId);
  }

  return (
    <div className="space-y-5">
      <PayrollPeriodFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        preset={preset}
        onPresetChange={setPreset}
      />

      {lock ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
          Week closed — figures frozen. Reopen from Weekly close if needed.
        </p>
      ) : null}
      {loading ? <p className="text-sm text-subtle">Loading period…</p> : null}

      {/* Export files section */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5">
        <h2 className="text-sm font-semibold text-white">Export files</h2>
        <p className="mt-1 text-xs text-subtle">
          Download ready-to-use files for your accounting system. Close the week first for final numbers.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ExportCard
            title="Journal"
            description="Debit/credit entries by employment type for your GL."
            onDownload={canExport ? () => {
              setView('journal');
              exportAccountingViewToCsv({
                view: 'journal',
                groupBy: 'staff',
                report: { ...report, slices },
                slices,
                rules,
                periodLabel,
                periodStart: dateRange.start,
                periodEnd: dateRange.end,
                companyName: COMPANY_NAME,
              });
            } : undefined}
          />
          <ExportCard
            title="Charge pack"
            description="Billing breakdown per site with hours and amounts by band."
            onDownload={canExport ? () => {
              setView('chargePack');
              exportAccountingViewToCsv({
                view: 'chargePack',
                groupBy: 'site',
                report: { ...report, slices },
                slices,
                rules,
                periodLabel,
                periodStart: dateRange.start,
                periodEnd: dateRange.end,
                companyName: COMPANY_NAME,
              });
            } : undefined}
          />
          <ExportCard
            title="Summary CSV"
            description="Full pay/charge/margin data grouped by your current view."
            onDownload={canExport ? handleExport : undefined}
          />
        </div>
      </section>

      {/* Advanced analysis section */}
      <details
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        className="rounded-2xl border border-border bg-surface-raised p-4"
      >
        <summary className="cursor-pointer text-sm font-semibold text-white">
          Advanced analysis & filters
        </summary>
        <p className="mt-1 text-xs text-subtle">
          Filter data, change views, and save presets for recurring reports.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                view === item.id
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border text-muted'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={groupBy}
            onChange={(event) => setGroupBy(event.target.value as AccountingGroupBy)}
            className={inputClass}
          >
            {GROUPS.map((item) => (
              <option key={item.id} value={item.id}>
                Group by {item.label}
              </option>
            ))}
          </select>
          <select
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            className={inputClass}
          >
            <option value="">All sites</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <select
            value={employeeDocId}
            onChange={(event) => setEmployeeDocId(event.target.value)}
            className={inputClass}
          >
            <option value="">All staff</option>
            {staff.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className={inputClass}
          >
            <option value="">All departments</option>
            {departments.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={employmentTypeId}
            onChange={(event) => setEmploymentTypeId(event.target.value)}
            className={inputClass}
          >
            <option value="">All employment types</option>
            {rules.employmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canExport ? (
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Download CSV
            </button>
          ) : null}
          {canEditRules ? (
            <button
              type="button"
              onClick={() => void savePreset()}
              disabled={savingPreset}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
            >
              {savingPreset ? 'Saving…' : 'Save preset'}
            </button>
          ) : null}
          {presets.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => applyPreset(item)}
              className="rounded-lg border border-border px-3 py-2 text-xs text-muted"
            >
              {item.name}
            </button>
          ))}
        </div>
      </details>

      {view === 'journal' ? (
        <JournalTable rows={journalRows} currency={currency} />
      ) : view === 'chargePack' ? (
        <ChargePackTable packs={packs} currency={currency} />
      ) : view === 'timesheet' ? (
        <TimesheetTable slices={slices} currency={currency} rules={rules} />
      ) : (
        <GroupedTable
          rows={grouped}
          view={view}
          currency={currency}
          rules={rules}
          groupBy={groupBy}
        />
      )}
    </div>
  );
}


function GroupedTable({
  rows,
  view,
  currency,
  rules,
  groupBy,
}: {
  rows: ReturnType<typeof groupAwardSlices>;
  view: AccountingReportView;
  currency: string;
  rules: PayRules;
  groupBy: AccountingGroupBy;
}) {
  const amountKey =
    view === 'charge' ? 'chargeAmount' : view === 'margin' ? 'margin' : 'payAmount';
  const hoursKey = view === 'charge' ? 'chargeHours' : 'payHours';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-primary/25 bg-primary/10">
            <th className="px-4 py-3 font-semibold text-white">Group</th>
            <th className="px-4 py-3 font-semibold text-white">Hours</th>
            <th className="px-4 py-3 font-semibold text-white">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-subtle">
                No award hours in this period.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className="border-b border-border/50">
                <td className="px-4 py-3 text-foreground">
                  {groupBy === 'employmentType'
                    ? rules.employmentTypes.find((type) => type.id === row.key)?.label ?? row.label
                    : groupBy === 'band'
                      ? row.key.includes(':')
                        ? `${dayTypeDisplayName(rules, row.key.split(':')[0] ?? '')} / ${bandDisplayName(rules, row.key.split(':')[1] ?? '')}`
                        : row.label
                      : row.label}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted">{row[hoursKey].toFixed(2)}</td>
                <td className="px-4 py-3 tabular-nums text-foreground">
                  {formatDashboardCurrency(row[amountKey], currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function TimesheetTable({
  slices,
  currency,
  rules,
}: {
  slices: AwardSlice[];
  currency: string;
  rules: PayRules;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-primary/25 bg-primary/10">
              <th className="px-4 py-3 font-semibold text-white">Date</th>
              <th className="px-4 py-3 font-semibold text-white">Staff</th>
              <th className="px-4 py-3 font-semibold text-white">Site</th>
              <th className="px-4 py-3 font-semibold text-white">Band</th>
              <th className="px-4 py-3 font-semibold text-white">Pay hrs</th>
              <th className="px-4 py-3 font-semibold text-white">Charge hrs</th>
              <th className="px-4 py-3 font-semibold text-white">Pay</th>
              <th className="px-4 py-3 font-semibold text-white">Charge</th>
            </tr>
          </thead>
          <tbody>
            {slices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-subtle">
                  No award hours in this period.
                </td>
              </tr>
            ) : (
              slices.map((slice) => (
                <tr
                  key={`${slice.sessionKey}|${slice.date}|${slice.dayTypeId}|${slice.bandId}`}
                  className="border-b border-border/50"
                >
                  <td className="px-4 py-3 text-muted">{slice.date}</td>
                  <td className="px-4 py-3 text-foreground">{slice.employeeName}</td>
                  <td className="px-4 py-3 text-muted">{slice.locationName || '—'}</td>
                  <td className="px-4 py-3 text-muted">
                    {dayTypeDisplayName(rules, slice.dayTypeId)} /{' '}
                    {bandDisplayName(rules, slice.bandId)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {slice.payHours.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted">
                    {slice.chargeHours.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {formatDashboardCurrency(slice.payAmount, currency)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {formatDashboardCurrency(slice.chargeAmount, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JournalTable({ rows, currency }: { rows: AccountingJournalRow[]; currency: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-primary/25 bg-primary/10">
              <th className="px-4 py-3 font-semibold text-white">Account</th>
              <th className="px-4 py-3 font-semibold text-white">Debit</th>
              <th className="px-4 py-3 font-semibold text-white">Credit</th>
              <th className="px-4 py-3 font-semibold text-white">Tracking</th>
              <th className="px-4 py-3 font-semibold text-white">Memo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-subtle">
                  No journal lines in this period.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.accountCode}|${row.tracking}|${index}`} className="border-b border-border/50">
                  <td className="px-4 py-3 text-foreground">
                    <span className="font-mono text-xs text-muted">{row.accountCode}</span>
                    <span className="ml-2">{row.accountName}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {row.debit > 0 ? formatDashboardCurrency(row.debit, currency) : ''}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    {row.credit > 0 ? formatDashboardCurrency(row.credit, currency) : ''}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.tracking || '—'}</td>
                  <td className="px-4 py-3 text-xs text-subtle">{row.memo || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChargePackTable({ packs, currency }: { packs: SiteChargePack[]; currency: string }) {
  return (
    <div className="space-y-4">
      {packs.length === 0 ? (
        <p className="rounded-xl border border-border px-4 py-10 text-center text-sm text-subtle">
          No charge hours in this period.
        </p>
      ) : (
        packs.map((pack) => (
          <div key={pack.locationId} className="overflow-hidden rounded-xl border border-border bg-surface-raised">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
              <p className="font-medium text-white">{pack.locationName}</p>
              <p className="text-sm tabular-nums text-foreground">
                {formatDashboardCurrency(pack.amount, currency)} · {pack.hours.toFixed(2)} h
                {pack.minHoursApplied > 0
                  ? ` · ${pack.minHoursApplied.toFixed(2)} min hours`
                  : ''}
              </p>
            </div>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-4 py-2 font-medium text-muted">Day type</th>
                  <th className="px-4 py-2 font-medium text-muted">Band</th>
                  <th className="px-4 py-2 font-medium text-muted">Hours</th>
                  <th className="px-4 py-2 font-medium text-muted">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pack.bands.map((band) => (
                  <tr key={`${band.dayTypeId}:${band.bandId}`} className="border-b border-border/40">
                    <td className="px-4 py-2 text-foreground">{band.dayTypeName}</td>
                    <td className="px-4 py-2 text-muted">{band.bandName}</td>
                    <td className="px-4 py-2 tabular-nums text-muted">{band.hours.toFixed(2)}</td>
                    <td className="px-4 py-2 tabular-nums text-foreground">
                      {formatDashboardCurrency(band.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

function ExportCard({
  title,
  description,
  onDownload,
}: {
  title: string;
  description: string;
  onDownload?: () => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 flex-1 text-xs text-subtle">{description}</p>
      {onDownload ? (
        <button
          type="button"
          onClick={onDownload}
          className="mt-3 self-start rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
        >
          Download CSV
        </button>
      ) : (
        <p className="mt-3 text-xs text-muted">No export permission</p>
      )}
    </div>
  );
}
