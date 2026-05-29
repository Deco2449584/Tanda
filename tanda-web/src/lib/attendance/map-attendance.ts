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
    type: record.type === 'check_out' ? 'check_out' : 'check_in',
    timestampServer: record.timestampServer ?? null,
    photoUrl: typeof record.photoUrl === 'string' ? record.photoUrl : '',
    source: typeof record.source === 'string' ? record.source : '',
  };
}
