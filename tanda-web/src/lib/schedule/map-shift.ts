import type { Shift, ShiftFirestore, ShiftStatus } from '@/lib/types/shift';

function toMillis(value: unknown): number {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return 0;
}

export function mapShiftDoc(id: string, data: Record<string, unknown>): Shift {
  const shift = data as Partial<ShiftFirestore>;
  const status: ShiftStatus =
    shift.status === 'completed' || shift.status === 'absent'
      ? shift.status
      : 'scheduled';

  const confirmationStatus =
    shift.confirmationStatus === 'pending' ||
    shift.confirmationStatus === 'confirmed' ||
    shift.confirmationStatus === 'declined'
      ? shift.confirmationStatus
      : undefined;

  return {
    id,
    employeeId: typeof shift.employeeId === 'string' ? shift.employeeId : '',
    date: typeof shift.date === 'string' ? shift.date : '',
    startTime: typeof shift.startTime === 'string' ? shift.startTime : '',
    endTime: typeof shift.endTime === 'string' ? shift.endTime : '',
    department: typeof shift.department === 'string' ? shift.department : '',
    locationId: typeof shift.locationId === 'string' ? shift.locationId : undefined,
    locationNameSnapshot:
      typeof shift.locationNameSnapshot === 'string'
        ? shift.locationNameSnapshot
        : undefined,
    locationCitySnapshot:
      typeof shift.locationCitySnapshot === 'string'
        ? shift.locationCitySnapshot
        : undefined,
    status,
    note: typeof shift.note === 'string' ? shift.note : undefined,
    confirmationStatus,
    confirmationNote:
      typeof shift.confirmationNote === 'string' ? shift.confirmationNote : undefined,
    confirmedAt: toMillis(shift.confirmedAt) || undefined,
  };
}
