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
    kioskDeviceLabelSnapshot:
      typeof record.kioskDeviceLabelSnapshot === 'string'
        ? record.kioskDeviceLabelSnapshot
        : undefined,
  };
}
