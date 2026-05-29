import { calculateWorkedHoursInRange } from '@/lib/attendance/work-sessions';
import type { DateRange } from '@/lib/attendance/date-range';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';

export interface PayrollReportRow {
  employeeId: string;
  name: string;
  hourlyRate: number;
  totalHours: number;
  totalPay: number;
}

const MIN_HOURS = 1 / 60;

export function buildPayrollReportRows(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
): PayrollReportRow[] {
  const employeesByCode = new Map(
    employees.map((employee) => [employee.employeeId, employee]),
  );

  const employeeIds = new Set(records.map((record) => record.employeeId));
  const rows: PayrollReportRow[] = [];

  employeeIds.forEach((employeeId) => {
    const employeeRecords = records.filter(
      (record) => record.employeeId === employeeId,
    );
    const totalHours = calculateWorkedHoursInRange(
      employeeRecords,
      dateRange.start,
      dateRange.end,
    );

    if (totalHours < MIN_HOURS) return;

    const employee = employeesByCode.get(employeeId);
    const hourlyRate = employee?.hourlyRate ?? 0;
    const roundedHours = Math.round(totalHours * 100) / 100;

    rows.push({
      employeeId,
      name: employee?.name ?? employeeRecords[0]?.employeeNameSnapshot ?? 'No name',
      hourlyRate,
      totalHours: roundedHours,
      totalPay: Math.round(roundedHours * hourlyRate * 100) / 100,
    });
  });

  return rows.sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

export function exportPayrollReportToCsv(
  records: AttendanceRecord[],
  employees: Employee[],
  dateRange: DateRange,
) {
  const rows = buildPayrollReportRows(records, employees, dateRange);
  if (rows.length === 0) return;

  const headers = [
    'Employee ID',
    'Name',
    'Hourly Rate ($)',
    'Total Hours Worked',
    'Total Pay ($)',
  ];

  const csvRows = rows.map((row) => [
    row.employeeId,
    row.name,
    row.hourlyRate.toFixed(2),
    row.totalHours.toFixed(2),
    row.totalPay.toFixed(2),
  ]);

  const csvContent = [headers, ...csvRows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `payroll-report-${dateRange.start}_${dateRange.end}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
