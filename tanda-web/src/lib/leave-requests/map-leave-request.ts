import type {
  LeaveRequest,
  LeaveRequestFirestore,
  LeaveRequestStatus,
} from '@/lib/types/leave-request';

function normalizeStatus(status: unknown): LeaveRequestStatus {
  if (status === 'Aprobado' || status === 'Rechazado') return status;
  return 'Pendiente';
}

export function mapLeaveRequestDoc(
  id: string,
  data: Record<string, unknown>,
): LeaveRequest {
  const request = data as Partial<LeaveRequestFirestore>;

  return {
    id,
    employeeId: typeof request.employeeId === 'string' ? request.employeeId : '',
    startDate: typeof request.startDate === 'string' ? request.startDate : '',
    endDate: typeof request.endDate === 'string' ? request.endDate : '',
    type: typeof request.type === 'string' ? request.type : 'Personal',
    justification:
      typeof request.justification === 'string' ? request.justification : '',
    status: normalizeStatus(request.status),
    createdAt: request.createdAt,
  };
}
