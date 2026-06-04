import {
  buildWorkSessions,
  calculateWorkedDaysInRange,
  calculateWorkedHoursInRange,
} from '@/lib/attendance/work-sessions';
import { formatRecordDate } from '@/lib/attendance/format';
import { compareInputDates } from '@/lib/dates/input-date';
import { formatPayPeriodLabel, type DateRange } from '@/lib/attendance/date-range';
import { COMPANY_NAME } from '@/lib/types/company-settings';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';

export interface PayrollReportRow {
  employeeId: string;
  name: string;
  department: string;
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
  const sessions = buildWorkSessions(records);

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
  options?: { companyName?: string; currency?: string },
): PayrollReport {
  const companyName = options?.companyName ?? COMPANY_NAME;
  const currency = options?.currency ?? 'AUD';

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
    );

    const daysWorked = calculateWorkedDaysInRange(
      employeeRecords,
      dateRange.start,
      dateRange.end,
    );
    const hourlyRate = employee.hourlyRate ?? 0;
    const roundedHours = Math.round(totalHours * 100) / 100;
    const grossPay = Math.round(roundedHours * hourlyRate * 100) / 100;

    rows.push({
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department?.trim() || '—',
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

export function exportPayrollReportToCsv(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
  options?: { companyName?: string; currency?: string },
): boolean {
  const report = buildPayrollReport(records, employees, dateRange, options);
  const hasActiveEmployees = employees.some((employee) => employee.active);
  if (!hasActiveEmployees) return false;

  const csvContent = buildCsvLines(report).join('\n');
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `payroll-weekly-${report.periodStart}_${report.periodEnd}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return true;
}

export function formatPayrollSummaryText(report: PayrollReport): string {
  return `${report.periodLabel}: ${formatMoney(report.totals.grossPay, report.currency)} for ${report.totals.employees} employee(s), ${report.totals.totalHours.toFixed(2)} hours over ${report.totals.daysWorked} day(s).`;
}
