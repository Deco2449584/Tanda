import { formatInspectionDate } from '@/lib/inspections/format';
import { getConservationLabel } from '@/lib/inspections/normalize-conservation';
import {
  getInspectionListStatus,
  resolveInspectionStatus,
} from '@/lib/inspections/status';
import type { InspectionDateRange } from '@/lib/inspections/filters';
import type { CargoInspection } from '@/lib/types/cargo-inspection';

function rangeFileLabel(range: InspectionDateRange): string {
  const from = range.from.toISOString().slice(0, 10);
  const to = range.to.toISOString().slice(0, 10);
  return `${from}_${to}`;
}

const CSV_HEADERS = [
  'ULD ID',
  'AWB Number',
  'Client',
  'Client Location ID',
  'Status',
  'Lifecycle',
  'Conservation',
  'Food Type',
  'Weight (Kg)',
  'Box Count',
  'Temperature (°C)',
  'Exit Vehicle Plate',
  'Driver Name',
  'Transport Company',
  'Has Issues',
  'Issue Description',
  'Issue Reported At',
  'Photos',
  'Videos',
  'Inspector Email',
  'Registered At',
  'Loaded On Truck At',
  'Updated',
  'Latitude',
  'Longitude',
  'GPS Accuracy (m)',
  'GPS Captured At',
] as const;

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function inspectionToRow(inspection: CargoInspection): string[] {
  const listStatus = getInspectionListStatus(inspection);

  return [
    inspection.uldId,
    inspection.awbNumber,
    inspection.clientLocationName ?? '',
    inspection.clientLocationId ?? '',
    listStatus.label,
    resolveInspectionStatus(inspection),
    getConservationLabel(inspection.conservationType),
    inspection.foodType,
    String(inspection.weightKg),
    String(inspection.boxCount),
    typeof inspection.temperatureCelsius === 'number'
      ? String(inspection.temperatureCelsius)
      : '',
    inspection.exitVehiclePlate ?? '',
    inspection.driverName ?? '',
    inspection.transportCompany ?? '',
    inspection.hasIssues ? 'Yes' : 'No',
    inspection.issueDescription ?? '',
    inspection.issueReportedAt
      ? formatInspectionDate(inspection.issueReportedAt)
      : '',
    String(inspection.photoEvidence.length),
    String(inspection.videoEvidence.length),
    inspection.createdBy,
    formatInspectionDate(inspection.registeredAt),
    inspection.dispatchedAt ? formatInspectionDate(inspection.dispatchedAt) : '',
    inspection.updatedAt ? formatInspectionDate(inspection.updatedAt) : '',
    typeof inspection.registeredLatitude === 'number'
      ? String(inspection.registeredLatitude)
      : '',
    typeof inspection.registeredLongitude === 'number'
      ? String(inspection.registeredLongitude)
      : '',
    typeof inspection.registeredAccuracyMeters === 'number'
      ? String(inspection.registeredAccuracyMeters)
      : '',
    inspection.registeredLocationAt
      ? formatInspectionDate(inspection.registeredLocationAt)
      : '',
  ];
}

function buildCsvContent(inspections: CargoInspection[]): string {
  const rows = inspections.map((item) =>
    inspectionToRow(item).map(escapeCsv).join(','),
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

export function exportInspectionsToCsv(
  inspections: CargoInspection[],
  range: InspectionDateRange,
): boolean {
  if (inspections.length === 0) return false;

  const csvContent = buildCsvContent(inspections);
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inspections-${rangeFileLabel(range)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return true;
}
