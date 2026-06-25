import type { AttendanceRecord, AttendanceRecordFirestore } from '@/lib/types/attendance';

export function mapAttendanceDoc(
  id: string,
  data: Record<string, unknown>,
): AttendanceRecord {
  const record = data as Partial<AttendanceRecordFirestore>;

  return {
    id,
    employeeId: record.employeeId ?? '',
    employeeNameSnapshot: record.employeeNameSnapshot ?? 'No name',
    employeeEmailSnapshot:
      typeof record.employeeEmailSnapshot === 'string'
        ? record.employeeEmailSnapshot
        : undefined,
    type: record.type === 'check_out' ? 'check_out' : 'check_in',
    timestampServer: record.timestampServer ?? null,
    photoUrl: typeof record.photoUrl === 'string' ? record.photoUrl : '',
    photoPath: typeof record.photoPath === 'string' ? record.photoPath : undefined,
    photoCaptured:
      typeof record.photoCaptured === 'boolean' ? record.photoCaptured : undefined,
    source: typeof record.source === 'string' ? record.source : '',
    locationId: typeof record.locationId === 'string' ? record.locationId : undefined,
    locationNameSnapshot:
      typeof record.locationNameSnapshot === 'string'
        ? record.locationNameSnapshot
        : undefined,
    locationCitySnapshot:
      typeof record.locationCitySnapshot === 'string'
        ? record.locationCitySnapshot
        : undefined,
    kioskDeviceId:
      typeof record.kioskDeviceId === 'string' ? record.kioskDeviceId : undefined,
    kioskDeviceNameSnapshot:
      typeof record.kioskDeviceNameSnapshot === 'string'
        ? record.kioskDeviceNameSnapshot
        : undefined,
    kioskDeviceType:
      record.kioskDeviceType === 'tablet' || record.kioskDeviceType === 'mobile'
        ? record.kioskDeviceType
        : undefined,
    latitude: typeof record.latitude === 'number' ? record.latitude : undefined,
    longitude: typeof record.longitude === 'number' ? record.longitude : undefined,
    geoAccuracy:
      typeof record.geoAccuracy === 'number' ? record.geoAccuracy : undefined,
    geoCapturedAt:
      typeof record.geoCapturedAt === 'string' ? record.geoCapturedAt : undefined,
    geoAddress:
      typeof record.geoAddress === 'string' ? record.geoAddress : undefined,
    breakWaived:
      typeof record.breakWaived === 'boolean' ? record.breakWaived : undefined,
  };
}
