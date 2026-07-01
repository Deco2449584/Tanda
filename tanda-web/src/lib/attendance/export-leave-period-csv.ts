import { compareInputDates } from '@/lib/dates/input-date';
import type { DateRange } from '@/lib/attendance/date-range';
import { formatPayPeriodLabel } from '@/lib/attendance/date-range';
import type { Employee } from '@/lib/types/employee';
import type { LeaveRequest } from '@/lib/types/leave-request';

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function headerRow(label: string, value: string | number): string {
  return `${csvCell(label)},${csvCell(value)}`;
}

function rangesOverlap(
  leaveStart: string,
  leaveEnd: string,
  periodStart: string,
  periodEnd: string,
): boolean {
  return (
    compareInputDates(leaveStart, periodEnd) <= 0 &&
    compareInputDates(leaveEnd, periodStart) >= 0
  );
}

function downloadCsv(filename: string, lines: string[]): boolean {
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
  return true;
}

export function exportApprovedLeaveInPeriodToCsv(
  requests: LeaveRequest[],
  employees: Employee[],
  dateRange: DateRange,
): boolean {
  const employeeById = new Map(
    employees.map((employee) => [employee.employeeId, employee]),
  );

  const approvedInPeriod = requests
    .filter(
      (request) =>
        request.status === 'Approved' &&
        rangesOverlap(
          request.startDate,
          request.endDate,
          dateRange.start,
          dateRange.end,
        ),
    )
    .sort((a, b) => {
      const byStart = compareInputDates(a.startDate, b.startDate);
      if (byStart !== 0) return byStart;
      return a.employeeId.localeCompare(b.employeeId, 'en');
    });

  const lines: string[] = [
    headerRow('Report', 'Approved leave in period'),
    headerRow('Pay period', formatPayPeriodLabel(dateRange)),
    headerRow('Period start', dateRange.start),
    headerRow('Period end', dateRange.end),
    '',
    [
      csvCell('Employee ID'),
      csvCell('Employee name'),
      csvCell('Department'),
      csvCell('Leave type'),
      csvCell('Start date'),
      csvCell('End date'),
      csvCell('Justification'),
    ].join(','),
  ];

  approvedInPeriod.forEach((request) => {
    const employee = employeeById.get(request.employeeId);
    lines.push(
      [
        csvCell(request.employeeId),
        csvCell(employee?.name ?? request.employeeId),
        csvCell(employee?.department?.trim() || '—'),
        csvCell(request.type),
        csvCell(request.startDate),
        csvCell(request.endDate),
        csvCell(request.justification),
      ].join(','),
    );
  });

  if (approvedInPeriod.length === 0) {
    lines.push('');
    lines.push(headerRow('Note', 'No approved leave requests overlap this period.'));
  }

  return downloadCsv(
    `leave-approved-${dateRange.start}_${dateRange.end}.csv`,
    lines,
  );
}
