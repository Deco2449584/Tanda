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

/** Short label for table cells — keeps street + suburb when possible. */
export function formatShortLocation(record: AttendanceRecord): string {
  if (record.geoAddress?.trim()) {
    const parts = record.geoAddress
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}`;
    }

    const single = parts[0] ?? record.geoAddress.trim();
    return single.length > 42 ? `${single.slice(0, 39)}…` : single;
  }

  const coords = formatGeoCoordinates(record);
  if (coords) return coords;

  return '—';
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
