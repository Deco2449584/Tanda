import { formatAttendanceType, formatRecordDate, formatRecordTime } from '@/lib/attendance/format';
import { formatAttendanceProvenanceForExport } from '@/lib/attendance/attendance-provenance';
import {
  formatExportExactLocation,
  formatExportWarehouse,
} from '@/lib/attendance/location-display';
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
    'Warehouse',
    'Latitude',
    'Longitude',
    'GPS accuracy (m)',
    'Exact location',
    'Source',
    'Kiosk device',
    'Manual or adjusted',
    'Added by',
    'Added at',
    'Last edited by',
    'Last edited at',
  ];

  const csvRows = records.map((record) => {
    const provenance = formatAttendanceProvenanceForExport(record);

    return [
      employeeCodes[record.employeeId] ?? record.employeeId,
      record.employeeNameSnapshot,
      formatRecordDate(record.timestampServer),
      formatAttendanceType(record.type),
      formatRecordTime(record.timestampServer),
      formatExportWarehouse(record),
      record.latitude ?? '',
      record.longitude ?? '',
      record.geoAccuracy ?? '',
      formatExportExactLocation(record),
      record.source,
      record.kioskDeviceNameSnapshot ?? '',
      provenance.manualFlag,
      provenance.addedBy,
      provenance.addedAt,
      provenance.editedBy,
      provenance.editedAt,
    ];
  });

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
