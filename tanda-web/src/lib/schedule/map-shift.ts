import type { Shift, ShiftFirestore, ShiftStatus } from '@/lib/types/shift';

export function mapShiftDoc(id: string, data: Record<string, unknown>): Shift {
  const shift = data as Partial<ShiftFirestore>;
  const status: ShiftStatus =
    shift.status === 'completed' || shift.status === 'absent'
      ? shift.status
      : 'scheduled';

  return {
    id,
    employeeId: typeof shift.employeeId === 'string' ? shift.employeeId : '',
    date: typeof shift.date === 'string' ? shift.date : '',
    startTime: typeof shift.startTime === 'string' ? shift.startTime : '',
    endTime: typeof shift.endTime === 'string' ? shift.endTime : '',
    department: typeof shift.department === 'string' ? shift.department : '',
    status,
    note: typeof shift.note === 'string' ? shift.note : undefined,
  };
}
