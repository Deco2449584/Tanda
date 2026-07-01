import {
  buildWorkSessionsFromRecords,
  calculateWorkedDaysInRange,
  calculateWorkedHoursInRange,
} from '@/lib/attendance/work-sessions';
import { formatRecordDate } from '@/lib/attendance/format';
import { compareInputDates } from '@/lib/dates/input-date';
import { formatPayPeriodLabel, type DateRange } from '@/lib/attendance/date-range';
import { getSiteKeyForEmployee } from '@/lib/dashboard/filter-dashboard-data';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import type { AttendanceBreakSettings } from '@/lib/types/company-settings';
import {
  DEFAULT_ATTENDANCE_BREAK,
  DEFAULT_PAYROLL_ACCOUNTING,
  type PayrollAccountingSettings,
} from '@/lib/types/company-settings';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';
import type { Location } from '@/lib/types/location';

export interface PayrollReportRow {
  employeeId: string;
  name: string;
  department: string;
  location: string;
  hourlyRate: number;
  daysWorked: number;
  totalHours: number;
  grossPay: number;
}

export interface PayrollReport {
  companyName: string;
  currency: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  rows: PayrollReportRow[];
  totals: {
    employees: number;
    daysWorked: number;
    totalHours: number;
    grossPay: number;
  };
  incompleteSessions: number;
}

export interface PayrollGroupReportRow {
  groupKey: string;
  employeeCount: number;
  totalHours: number;
  grossPay: number;
}

export interface PayrollGroupReport {
  companyName: string;
  currency: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  groupBy: 'location' | 'department';
  rows: PayrollGroupReportRow[];
  totals: {
    employees: number;
    totalHours: number;
    grossPay: number;
  };
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatGeneratedAt(): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function countIncompleteSessionsInRange(
  records: AttendanceRecord[],
  dateRange: DateRange,
): number {
  const sessions = buildWorkSessionsFromRecords(records);

  return sessions.filter((session) => {
    if (session.status === 'complete') return false;

    const sessionDate = formatRecordDate(session.checkIn.timestampServer);
    return (
      compareInputDates(sessionDate, dateRange.start) >= 0 &&
      compareInputDates(sessionDate, dateRange.end) <= 0
    );
  }).length;
}

export function buildPayrollReport(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
  options?: {
    companyName?: string;
    currency?: string;
    attendanceBreak?: AttendanceBreakSettings;
    locations?: Location[];
  },
): PayrollReport {
  const companyName = options?.companyName ?? COMPANY_NAME;
  const currency = options?.currency ?? 'AUD';
  const attendanceBreak = options?.attendanceBreak ?? DEFAULT_ATTENDANCE_BREAK;

  const activeEmployees = employees
    .filter((employee) => employee.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  const recordsByEmployee = new Map<string, AttendanceRecord[]>();
  records.forEach((record) => {
    const existing = recordsByEmployee.get(record.employeeId) ?? [];
    existing.push(record);
    recordsByEmployee.set(record.employeeId, existing);
  });

  const rows: PayrollReportRow[] = [];

  activeEmployees.forEach((employee) => {
    const employeeRecords = recordsByEmployee.get(employee.employeeId) ?? [];
    const totalHours = calculateWorkedHoursInRange(
      employeeRecords,
      dateRange.start,
      dateRange.end,
      attendanceBreak,
    );

    const daysWorked = calculateWorkedDaysInRange(
      employeeRecords,
      dateRange.start,
      dateRange.end,
      attendanceBreak,
    );
    const hourlyRate = employee.hourlyRate ?? 0;
    const roundedHours = Math.round(totalHours * 100) / 100;
    const grossPay = Math.round(roundedHours * hourlyRate * 100) / 100;

    rows.push({
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department?.trim() || '—',
      location: options?.locations
        ? getSiteKeyForEmployee(employee, options.locations)
        : '—',
      hourlyRate,
      daysWorked,
      totalHours: roundedHours,
      grossPay,
    });
  });

  const totals = rows.reduce(
    (acc, row) => ({
      employees: acc.employees + 1,
      daysWorked: acc.daysWorked + row.daysWorked,
      totalHours: Math.round((acc.totalHours + row.totalHours) * 100) / 100,
      grossPay: Math.round((acc.grossPay + row.grossPay) * 100) / 100,
    }),
    {
      employees: 0,
      daysWorked: 0,
      totalHours: 0,
      grossPay: 0,
    },
  );

  return {
    companyName,
    currency,
    periodLabel: formatPayPeriodLabel(dateRange),
    periodStart: dateRange.start,
    periodEnd: dateRange.end,
    generatedAt: formatGeneratedAt(),
    rows,
    totals,
    incompleteSessions: countIncompleteSessionsInRange(records, dateRange),
  };
}

/** @deprecated Use buildPayrollReport — kept for compatibility */
export function buildPayrollReportRows(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
): PayrollReportRow[] {
  return buildPayrollReport(records, employees, dateRange).rows;
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function headerRow(label: string, value: string | number): string {
  return `${csvCell(label)},${csvCell(value)}`;
}

function downloadCsv(filename: string, lines: string[]): void {
  const csvContent = lines.join('\n');
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildGroupReport(
  report: PayrollReport,
  groupBy: 'location' | 'department',
): PayrollGroupReport {
  const grouped = new Map<
    string,
    { employeeIds: Set<string>; totalHours: number; grossPay: number }
  >();

  report.rows.forEach((row) => {
    const key =
      groupBy === 'location'
        ? row.location || 'Unassigned'
        : row.department || '—';
    const existing = grouped.get(key) ?? {
      employeeIds: new Set<string>(),
      totalHours: 0,
      grossPay: 0,
    };
    existing.employeeIds.add(row.employeeId);
    existing.totalHours = Math.round((existing.totalHours + row.totalHours) * 100) / 100;
    existing.grossPay = Math.round((existing.grossPay + row.grossPay) * 100) / 100;
    grouped.set(key, existing);
  });

  const rows: PayrollGroupReportRow[] = [...grouped.entries()]
    .map(([groupKey, value]) => ({
      groupKey,
      employeeCount: value.employeeIds.size,
      totalHours: value.totalHours,
      grossPay: value.grossPay,
    }))
    .sort((a, b) => a.groupKey.localeCompare(b.groupKey, 'en'));

  return {
    companyName: report.companyName,
    currency: report.currency,
    periodLabel: report.periodLabel,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    generatedAt: report.generatedAt,
    groupBy,
    rows,
    totals: {
      employees: report.totals.employees,
      totalHours: report.totals.totalHours,
      grossPay: report.totals.grossPay,
    },
  };
}

export function buildPayrollByLocationReport(
  report: PayrollReport,
): PayrollGroupReport {
  return buildGroupReport(report, 'location');
}

export function buildPayrollByDepartmentReport(
  report: PayrollReport,
): PayrollGroupReport {
  return buildGroupReport(report, 'department');
}

function buildGroupCsvLines(groupReport: PayrollGroupReport): string[] {
  const groupLabel =
    groupReport.groupBy === 'location' ? 'Location' : 'Department';
  const reportTitle =
    groupReport.groupBy === 'location'
      ? 'Payroll by location'
      : 'Payroll by department';

  const lines: string[] = [
    headerRow('Report', reportTitle),
    headerRow('Company', groupReport.companyName),
    headerRow('Pay period', groupReport.periodLabel),
    headerRow('Period start', groupReport.periodStart),
    headerRow('Period end', groupReport.periodEnd),
    headerRow('Currency', groupReport.currency),
    headerRow('Generated at', groupReport.generatedAt),
    '',
    [
      csvCell(groupLabel),
      csvCell('Employees'),
      csvCell('Hours worked'),
      csvCell('Gross pay'),
    ].join(','),
  ];

  groupReport.rows.forEach((row) => {
    lines.push(
      [
        csvCell(row.groupKey),
        csvCell(row.employeeCount),
        csvCell(row.totalHours.toFixed(2)),
        csvCell(row.grossPay.toFixed(2)),
      ].join(','),
    );
  });

  lines.push('');
  lines.push(
    [
      csvCell('TOTALS'),
      csvCell(groupReport.totals.employees),
      csvCell(groupReport.totals.totalHours.toFixed(2)),
      csvCell(groupReport.totals.grossPay.toFixed(2)),
    ].join(','),
  );

  return lines;
}

function buildJournalCsvLines(
  report: PayrollReport,
  payrollAccounting: PayrollAccountingSettings,
): string[] {
  const locationReport = buildPayrollByLocationReport(report);
  const journalDate = report.periodEnd;
  const description = `Weekly payroll - ${report.periodLabel}`;

  const lines: string[] = [
    headerRow('Report', 'Payroll journal'),
    headerRow('Company', report.companyName),
    headerRow('Pay period', report.periodLabel),
    headerRow('Journal date', journalDate),
    headerRow('Generated at', report.generatedAt),
    '',
    [
      csvCell('Date'),
      csvCell('Account code'),
      csvCell('Account name'),
      csvCell('Description'),
      csvCell('Debit'),
      csvCell('Credit'),
      csvCell('Tracking'),
    ].join(','),
  ];

  locationReport.rows.forEach((row) => {
    if (row.grossPay <= 0) return;
    lines.push(
      [
        csvCell(journalDate),
        csvCell(payrollAccounting.wagesExpenseAccountCode),
        csvCell(payrollAccounting.wagesExpenseAccountName),
        csvCell(description),
        csvCell(row.grossPay.toFixed(2)),
        csvCell(''),
        csvCell(row.groupKey),
      ].join(','),
    );
  });

  if (report.totals.grossPay > 0) {
    lines.push(
      [
        csvCell(journalDate),
        csvCell(payrollAccounting.wagesPayableAccountCode),
        csvCell(payrollAccounting.wagesPayableAccountName),
        csvCell(description),
        csvCell(''),
        csvCell(report.totals.grossPay.toFixed(2)),
        csvCell(''),
      ].join(','),
    );
  }

  lines.push('');
  lines.push(
    [
      csvCell('TOTALS'),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(report.totals.grossPay.toFixed(2)),
      csvCell(report.totals.grossPay.toFixed(2)),
      csvCell(''),
    ].join(','),
  );

  return lines;
}

function buildCsvLines(report: PayrollReport): string[] {
  const { currency } = report;
  const lines: string[] = [
    headerRow('Report', 'Weekly payroll'),
    headerRow('Company', report.companyName),
    headerRow('Pay period', report.periodLabel),
    headerRow('Period start', report.periodStart),
    headerRow('Period end', report.periodEnd),
    headerRow('Currency', currency),
    headerRow('Generated at', report.generatedAt),
    '',
    [
      csvCell('Employee ID'),
      csvCell('Employee name'),
      csvCell('Department'),
      csvCell('Location'),
      csvCell('Hourly rate'),
      csvCell('Days worked'),
      csvCell('Hours worked'),
      csvCell('Gross pay'),
    ].join(','),
  ];

  report.rows.forEach((row) => {
    lines.push(
      [
        csvCell(row.employeeId),
        csvCell(row.name),
        csvCell(row.department),
        csvCell(row.location),
        csvCell(row.hourlyRate.toFixed(2)),
        csvCell(row.daysWorked),
        csvCell(row.totalHours.toFixed(2)),
        csvCell(row.grossPay.toFixed(2)),
      ].join(','),
    );
  });

  lines.push(csvCell(''));
  lines.push(
    [
      csvCell('TOTALS'),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(report.totals.daysWorked),
      csvCell(report.totals.totalHours.toFixed(2)),
      csvCell(report.totals.grossPay.toFixed(2)),
    ].join(','),
  );
  lines.push(
    [
      csvCell('Employees paid'),
      csvCell(report.totals.employees),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(''),
    ].join(','),
  );
  lines.push(
    [
      csvCell('Total gross payroll'),
      csvCell(formatMoney(report.totals.grossPay, currency)),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(''),
      csvCell(''),
    ].join(','),
  );

  if (report.incompleteSessions > 0) {
    lines.push('');
    lines.push(
      headerRow(
        'Note',
        `${report.incompleteSessions} incomplete session(s) in period (no check-out) — excluded from pay. See Attendance.`,
      ),
    );
  }

  return lines;
}

export interface PayrollExportOptions {
  companyName?: string;
  currency?: string;
  attendanceBreak?: AttendanceBreakSettings;
  locations?: Location[];
  payrollAccounting?: PayrollAccountingSettings;
}

function buildReportForExport(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
  options?: PayrollExportOptions,
): PayrollReport | null {
  const hasActiveEmployees = employees.some((employee) => employee.active);
  if (!hasActiveEmployees) return null;

  return buildPayrollReport(records, employees, dateRange, options);
}

export function exportPayrollReportToCsv(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
  options?: PayrollExportOptions,
): boolean {
  const report = buildReportForExport(records, employees, dateRange, options);
  if (!report) return false;

  downloadCsv(
    `payroll-weekly-${report.periodStart}_${report.periodEnd}.csv`,
    buildCsvLines(report),
  );

  return true;
}

export function exportPayrollByLocationToCsv(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
  options?: PayrollExportOptions,
): boolean {
  const report = buildReportForExport(records, employees, dateRange, options);
  if (!report) return false;

  const groupReport = buildPayrollByLocationReport(report);
  downloadCsv(
    `payroll-by-location-${report.periodStart}_${report.periodEnd}.csv`,
    buildGroupCsvLines(groupReport),
  );

  return true;
}

export function exportPayrollByDepartmentToCsv(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
  options?: PayrollExportOptions,
): boolean {
  const report = buildReportForExport(records, employees, dateRange, options);
  if (!report) return false;

  const groupReport = buildPayrollByDepartmentReport(report);
  downloadCsv(
    `payroll-by-department-${report.periodStart}_${report.periodEnd}.csv`,
    buildGroupCsvLines(groupReport),
  );

  return true;
}

export function exportPayrollJournalToCsv(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
  options?: PayrollExportOptions,
): boolean {
  const report = buildReportForExport(records, employees, dateRange, options);
  if (!report) return false;

  const payrollAccounting =
    options?.payrollAccounting ?? DEFAULT_PAYROLL_ACCOUNTING;

  downloadCsv(
    `payroll-journal-${report.periodStart}_${report.periodEnd}.csv`,
    buildJournalCsvLines(report, payrollAccounting),
  );

  return true;
}

export function formatPayrollSummaryText(report: PayrollReport): string {
  return `${report.periodLabel}: ${formatMoney(report.totals.grossPay, report.currency)} for ${report.totals.employees} employee(s), ${report.totals.totalHours.toFixed(2)} hours over ${report.totals.daysWorked} day(s).`;
}
