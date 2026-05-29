import type {
  LeaveRequest,
  LeaveRequestFirestore,
  LeaveRequestStatus,
  LeaveRequestType,
} from '@/lib/types/leave-request';

function normalizeStatus(status: unknown): LeaveRequestStatus {
  if (status === 'Approved' || status === 'Aprobado') return 'Approved';
  if (status === 'Rejected' || status === 'Rechazado') return 'Rejected';
  if (status === 'Pending' || status === 'Pendiente') return 'Pending';
  return 'Pending';
}

const LEGACY_TYPE_MAP: Record<string, LeaveRequestType> = {
  Vacaciones: 'Vacation',
  'Permiso Médico': 'Medical Leave',
  'Calamidad Doméstica': 'Family Emergency',
  Personal: 'Personal',
  Vacation: 'Vacation',
  'Medical Leave': 'Medical Leave',
  'Family Emergency': 'Family Emergency',
};

function normalizeType(type: unknown): LeaveRequestType {
  if (typeof type !== 'string') return 'Personal';
  return LEGACY_TYPE_MAP[type] ?? 'Personal';
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
    type: normalizeType(request.type),
    justification:
      typeof request.justification === 'string' ? request.justification : '',
    status: normalizeStatus(request.status),
    createdAt: request.createdAt,
  };
}
