import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { CargoInspection } from '@/types';
import { formatInspectionDate } from '@/utils/formatDate';
import { getConservationLabel } from '@/utils/cargoLabels';
import { getInspectionStatusExportLabel } from '@/utils/cargoInspectionStatus';
import { getUnitTypeLabel } from '@/utils/cargoUnitType';

const CSV_HEADERS = [
  'ULD ID',
  'Unit Type',
  'AWB Number',
  'Client',
  'Client Location ID',
  'Conservation',
  'Food Type',
  'Weight (Kg)',
  'Box Count',
  'Temperature (°C)',
  'Exit Vehicle Plate',
  'Driver Name',
  'Transport Company',
  'Status',
  'Has Issues',
  'Issue Description',
  'Issue Reported At',
  'Inspector Email',
  'Registered At',
  'Loaded On Truck At',
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
  return [
    inspection.uldId || '—',
    getUnitTypeLabel(inspection.unitType),
    inspection.awbNumber,
    inspection.clientLocationName ?? '',
    inspection.clientLocationId ?? '',
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
    getInspectionStatusExportLabel(inspection),
    inspection.hasIssues ? 'Yes' : 'No',
    inspection.issueDescription ?? '',
    inspection.issueReportedAt
      ? formatInspectionDate(inspection.issueReportedAt)
      : '',
    inspection.createdBy,
    formatInspectionDate(inspection.registeredAt),
    inspection.dispatchedAt ? formatInspectionDate(inspection.dispatchedAt) : '',
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

async function shareTextFile(
  filename: string,
  content: string,
  mimeType: string,
): Promise<void> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('Cache directory is not available on this device.');
  }

  const uri = `${cacheDir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Export inspections' });
}

export async function shareInspectionsAsCsv(
  inspections: CargoInspection[],
): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10);
  await shareTextFile(
    `continental-inspect-report-${timestamp}.csv`,
    buildCsvContent(inspections),
    'text/csv',
  );
}
