import { formatWorkedHours, type WorkedShiftRow } from '@/lib/attendance/describe-work-shift';
import type { DateRange } from '@/lib/attendance/date-range';

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

export function exportWorkedShiftsToCsv(
  rows: WorkedShiftRow[],
  employeeCodes: Record<string, string>,
  dateRange?: DateRange,
  employeeHourlyRates?: Record<string, number>,
) {
  if (rows.length === 0) return;

  const includePay = employeeHourlyRates !== undefined;

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
    ...(includePay ? ['Hourly rate', 'Gross pay'] : []),
  ];

  const csvRows = rows.map((row) => {
    const base = [
      employeeCodes[row.employeeId] ?? row.employeeId,
      row.employeeName,
      row.date,
      row.locationLabel,
      row.checkInTime,
      row.checkOutTime,
      formatWorkedHours(row.billableHours),
      formatWorkedHours(row.grossHours),
      row.break.summary,
    ];

    if (!includePay) return base;

    const rate = employeeHourlyRates[row.employeeId] ?? 0;
    const grossPay = Math.round(row.billableHours * rate * 100) / 100;
    return [...base, formatMoney(rate), formatMoney(grossPay)];
  });

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
