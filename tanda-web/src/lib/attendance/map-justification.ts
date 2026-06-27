import type { AttendanceJustification } from '@/lib/types/attendance-justification';

function toMillis(value: unknown): number | undefined {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

export function mapJustificationDoc(
  id: string,
  data: Record<string, unknown>,
): AttendanceJustification {
  return {
    id,
    employeeId: typeof data.employeeId === 'string' ? data.employeeId : '',
    employeeEmail: typeof data.employeeEmail === 'string' ? data.employeeEmail : '',
    employeeName: typeof data.employeeName === 'string' ? data.employeeName : '',
    shiftId: typeof data.shiftId === 'string' ? data.shiftId : '',
    date: typeof data.date === 'string' ? data.date : '',
    shiftStartTime: typeof data.shiftStartTime === 'string' ? data.shiftStartTime : '',
    shiftEndTime: typeof data.shiftEndTime === 'string' ? data.shiftEndTime : '',
    type: data.type === 'no_show' ? 'no_show' : 'late',
    reason: typeof data.reason === 'string' ? data.reason : '',
    status:
      data.status === 'submitted'
        ? 'submitted'
        : data.status === 'pending'
          ? 'pending'
          : data.status === 'approved'
            ? 'approved'
            : data.status === 'rejected'
              ? 'rejected'
              : 'awaiting_employee',
    lateMinutes:
      typeof data.lateMinutes === 'number' && Number.isFinite(data.lateMinutes)
        ? data.lateMinutes
        : undefined,
    submittedAt: toMillis(data.submittedAt),
    reviewedAt: toMillis(data.reviewedAt),
    reviewedByEmail:
      typeof data.reviewedByEmail === 'string' ? data.reviewedByEmail : undefined,
    reviewerNote: typeof data.reviewerNote === 'string' ? data.reviewerNote : undefined,
    adminAcknowledgedAt: toMillis(data.adminAcknowledgedAt),
    adminAcknowledgedByEmail:
      typeof data.adminAcknowledgedByEmail === 'string'
        ? data.adminAcknowledgedByEmail
        : undefined,
    createdAt: toMillis(data.createdAt) ?? 0,
    updatedAt: toMillis(data.updatedAt) ?? 0,
  };
}
