'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import {
  PayrollPeriodFilterBar,
  type PayrollPeriodPreset,
} from '@/components/payroll/PayrollPeriodFilterBar';
import {
  formatPayPeriodLabel,
  getLastWeekRange,
  toFirestoreRangeBounds,
  type DateRange,
} from '@/lib/attendance/date-range';
import { mapAttendanceDoc } from '@/lib/attendance/map-attendance';
import { buildWorkSessionsFromRecords } from '@/lib/attendance/work-sessions';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import { isPayrollEligibleEmployee } from '@/lib/employees/is-payroll-eligible-employee';
import {
  buildAwardReport,
  filterAwardSlices,
  groupAwardSlices,
  type AwardSlice,
} from '@/lib/payroll/award-calc';
import {
  exportAccountingViewToCsv,
  type AccountingGroupBy,
  type AccountingReportView,
} from '@/lib/payroll/award-export';
import { mapShiftDoc } from '@/lib/schedule/map-shift';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import type { AttendanceBreakSettings } from '@/lib/types/company-settings';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';
import type { PayRules } from '@/lib/types/pay-rules';
import type { Shift } from '@/lib/types/shift';

const inputClass =
  'w-full rounded-lg border border-border-strong bg-surface-base px-3 py-2 text-sm text-white outline-none focus:border-primary';

const VIEWS: Array<{ id: AccountingReportView; label: string }> = [
  { id: 'pay', label: 'Pay' },
  { id: 'charge', label: 'Charge' },
  { id: 'margin', label: 'Margin' },
  { id: 'timesheet', label: 'Timesheet' },
  { id: 'journal', label: 'Journal' },
];

const GROUPS: Array<{ id: AccountingGroupBy; label: string }> = [
  { id: 'staff', label: 'Staff' },
  { id: 'site', label: 'Site' },
  { id: 'date', label: 'Day' },
  { id: 'band', label: 'Band' },
  { id: 'employmentType', label: 'Employment type' },
];

const PRESET_KEY = 'tanda.accounting.reportPresets';

interface AccountingReportsPanelProps {
  rules: PayRules;
  timeZone: string;
  currency: string;
  attendanceBreak: AttendanceBreakSettings;
  employees: Employee[];
  locations: Location[];
  canExport: boolean;
}

export function AccountingReportsPanel({
  rules,
  timeZone,
  currency,
  attendanceBreak,
  employees,
  locations,
  canExport,
}: AccountingReportsPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange>(() => getLastWeekRange());
  const [preset, setPreset] = useState<PayrollPeriodPreset>('last-week');
  const [view, setView] = useState<AccountingReportView>('pay');
  const [groupBy, setGroupBy] = useState<AccountingGroupBy>('staff');
  const [locationId, setLocationId] = useState('');
  const [employeeDocId, setEmployeeDocId] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentTypeId, setEmploymentTypeId] = useState('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [sessions, setSessions] = useState<ReturnType<typeof buildWorkSessionsFromRecords>>([]);
  const [presets, setPresets] = useState<ReturnType<typeof readPresets>>([]);

  const loadPeriod = useCallback(async () => {
    if (!db) return;
    const { start, end } = toFirestoreRangeBounds(dateRange);
    const [attendanceSnapshot, shiftsSnapshot] = await Promise.all([
      getDocs(
        query(
          collection(db, COLLECTIONS.ATTENDANCE_RECORDS),
          where('timestampServer', '>=', start),
          where('timestampServer', '<=', end),
          orderBy('timestampServer', 'desc'),
          limit(5000),
        ),
      ),
      getDocs(
        query(
          collection(db, COLLECTIONS.SHIFTS),
          where('date', '>=', dateRange.start),
          where('date', '<=', dateRange.end),
        ),
      ),
    ]);
    const records = attendanceSnapshot.docs.map((doc) =>
      mapAttendanceDoc(doc.id, doc.data()),
    );
    setSessions(buildWorkSessionsFromRecords(records, attendanceBreak));
    setShifts(shiftsSnapshot.docs.map((doc) => mapShiftDoc(doc.id, doc.data())));
  }, [dateRange, attendanceBreak]);

  useEffect(() => {
    void loadPeriod();
  }, [loadPeriod]);

  useEffect(() => {
    setPresets(readPresets());
  }, []);

  const staff = useMemo(
    () => employees.filter(isPayrollEligibleEmployee),
    [employees],
  );
  const departments = useMemo(
    () =>
      [...new Set(staff.map((item) => item.department).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [staff],
  );

  const report = useMemo(
    () =>
      buildAwardReport({
        rules,
        timeZone,
        employees: staff,
        locations,
        sessions,
        shifts,
        dateRange,
      }),
    [rules, timeZone, staff, locations, sessions, shifts, dateRange],
  );

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
  const periodLabel = formatPayPeriodLabel(dateRange);

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

  function savePreset() {
    const name = window.prompt('Preset name');
    if (!name?.trim()) return;
    const existing = readPresets();
    existing.push({
      name: name.trim(),
      view,
      groupBy,
      locationId,
      employeeDocId,
      department,
      employmentTypeId,
    });
    window.localStorage.setItem(PRESET_KEY, JSON.stringify(existing));
    setPresets(existing);
  }

  return (
    <div className="space-y-5">
      <PayrollPeriodFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        preset={preset}
        onPresetChange={setPreset}
      />

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              view === item.id
                ? 'border-primary/50 bg-primary/15 text-primary'
                : 'border-border text-muted'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

      <div className="flex flex-wrap items-center gap-2">
        {canExport ? (
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Download CSV
          </button>
        ) : null}
        <button
          type="button"
          onClick={savePreset}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
        >
          Save preset
        </button>
        {presets.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => {
              setView(item.view);
              setGroupBy(item.groupBy);
              setLocationId(item.locationId);
              setEmployeeDocId(item.employeeDocId);
              setDepartment(item.department);
              setEmploymentTypeId(item.employmentTypeId);
            }}
            className="rounded-lg border border-border px-3 py-2 text-xs text-muted"
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="Pay" value={formatDashboardCurrency(report.totals.payAmount, currency)} />
        <SummaryCard
          label="Charge"
          value={formatDashboardCurrency(report.totals.chargeAmount, currency)}
        />
        <SummaryCard
          label="Margin"
          value={formatDashboardCurrency(report.totals.margin, currency)}
        />
        <SummaryCard
          label="Incomplete sessions"
          value={String(report.incompleteSessions)}
        />
      </div>

      {view === 'timesheet' ? (
        <TimesheetTable slices={slices} currency={currency} />
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised px-4 py-3">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
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

function TimesheetTable({ slices, currency }: { slices: AwardSlice[]; currency: string }) {
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
                    {slice.dayTypeId} / {slice.bandId}
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

function readPresets(): Array<{
  name: string;
  view: AccountingReportView;
  groupBy: AccountingGroupBy;
  locationId: string;
  employeeDocId: string;
  department: string;
  employmentTypeId: string;
}> {
  try {
    const raw = window.localStorage.getItem(PRESET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
