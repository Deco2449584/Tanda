import { formatAttendanceType, formatRecordDate, formatRecordTime } from '@/lib/attendance/format';
import type { AttendanceRecord } from '@/lib/types/attendance';

export function exportAttendanceRecordsToCsv(
  records: AttendanceRecord[],
  employeeCodes: Record<string, string>,
) {
  if (records.length === 0) return;

  const headers = [
    'Employee ID',
    'Employee',
    'Date',
    'Record Type',
    'Time',
  ];

  const csvRows = records.map((record) => [
    employeeCodes[record.employeeId] ?? record.employeeId,
    record.employeeNameSnapshot,
    formatRecordDate(record.timestampServer),
    formatAttendanceType(record.type),
    formatRecordTime(record.timestampServer),
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
  link.download = `attendance-report-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
