import {
  formatAttendanceType,
  formatRecordDate,
  formatRecordTime,
} from '@/lib/attendance/format';
import type { AttendanceRecord } from '@/lib/types/attendance';

export function exportAttendanceRecordsToCsv(
  records: AttendanceRecord[],
  employeeCodes: Record<string, string>,
) {
  if (records.length === 0) return;

  const headers = [
    'ID Empleado',
    'Empleado',
    'Fecha',
    'Tipo Registro',
    'Hora',
  ];

  const rows = records.map((record) => [
    employeeCodes[record.employeeId] ?? record.employeeId,
    record.employeeNameSnapshot,
    formatRecordDate(record.timestampServer),
    formatAttendanceType(record.type),
    formatRecordTime(record.timestampServer),
  ]);

  const csvContent = [headers, ...rows]
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
  link.download = `reporte-asistencia-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
