export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  ATTENDANCE_RECORDS: 'attendance_records',
  SHIFTS: 'shifts',
  LEAVE_REQUESTS: 'leave_requests',
} as const;

export const LEAVE_REQUEST_TYPES = [
  'Vacation',
  'Medical Leave',
  'Family Emergency',
  'Personal',
] as const;

export const LEAVE_REQUEST_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
] as const;
