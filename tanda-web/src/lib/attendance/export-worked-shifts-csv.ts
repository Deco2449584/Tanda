import { formatWorkedHours, type WorkedShiftRow } from '@/lib/attendance/describe-work-shift';
import type { DateRange } from '@/lib/attendance/date-range';

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function exportWorkedShiftsToCsv(
  rows: WorkedShiftRow[],
  employeeCodes: Record<string, string>,
  dateRange?: DateRange,
) {
  if (rows.length === 0) return;

  const headers = [
    'Employee ID',
    'Employee',
    'Date',
    'Warehouse',
    'Check-in',
    'Check-out',
    'Hours worked',
    'Gross hours',
    'Break',
  ];

  const csvRows = rows.map((row) => [
    employeeCodes[row.employeeId] ?? row.employeeId,
    row.employeeName,
    row.date,
    row.locationLabel,
    row.checkInTime,
    row.checkOutTime,
    formatWorkedHours(row.billableHours),
    formatWorkedHours(row.grossHours),
    row.break.summary,
  ]);

  const csvContent = [headers, ...csvRows]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const suffix = dateRange
    ? `${dateRange.start}_${dateRange.end}`
    : String(Date.now());

  link.download = `worked-shifts-${suffix}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
