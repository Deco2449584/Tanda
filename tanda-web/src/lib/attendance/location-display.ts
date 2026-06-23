import type { AttendanceRecord } from '@/lib/types/attendance';

export function formatWarehouseLabel(record: AttendanceRecord): string {
  if (record.locationNameSnapshot) {
    return record.locationCitySnapshot
      ? `${record.locationNameSnapshot} (${record.locationCitySnapshot})`
      : record.locationNameSnapshot;
  }
  return '—';
}

export function formatGeoCoordinates(record: AttendanceRecord): string | null {
  if (
    typeof record.latitude !== 'number' ||
    typeof record.longitude !== 'number'
  ) {
    return null;
  }

  return `${record.latitude.toFixed(6)}, ${record.longitude.toFixed(6)}`;
}

export function buildGoogleMapsUrl(record: AttendanceRecord): string | null {
  const coords = formatGeoCoordinates(record);
  if (!coords) return null;
  return `https://maps.google.com/?q=${record.latitude},${record.longitude}`;
}

export function formatExactLocation(record: AttendanceRecord): string {
  if (record.geoAddress?.trim()) {
    return record.geoAddress.trim();
  }

  const coords = formatGeoCoordinates(record);
  return coords ?? '—';
}

export function formatExportWarehouse(record: AttendanceRecord): string {
  return formatWarehouseLabel(record);
}

export function formatExportExactLocation(record: AttendanceRecord): string {
  if (record.geoAddress?.trim()) {
    return record.geoAddress.trim();
  }

  return formatGeoCoordinates(record) ?? '';
}
