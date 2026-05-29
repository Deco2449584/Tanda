export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  ATTENDANCE_RECORDS: 'attendance_records',
  SHIFTS: 'shifts',
  LEAVE_REQUESTS: 'leave_requests',
} as const;

export const LEAVE_REQUEST_TYPES = [
  'Vacaciones',
  'Permiso Médico',
  'Calamidad Doméstica',
  'Personal',
] as const;

export const LEAVE_REQUEST_STATUSES = [
  'Pendiente',
  'Aprobado',
  'Rechazado',
] as const;
