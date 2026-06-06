export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  ATTENDANCE_RECORDS: 'attendance_records',
  SHIFTS: 'shifts',
  LEAVE_REQUESTS: 'leave_requests',
  CARGO_INSPECTIONS: 'cargo_inspections',
  SETTINGS: 'settings',
} as const;

export const TIMEZONE_OPTIONS = [
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne' },
  { value: 'Australia/Brisbane', label: 'Australia/Brisbane' },
  { value: 'Australia/Perth', label: 'Australia/Perth' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'UTC', label: 'UTC' },
] as const;

export const CURRENCY_OPTIONS = [
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'NZD', label: 'NZD — New Zealand Dollar' },
] as const;

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
