export const COMPANY_NAME = 'Continental Cargo';

export interface AttendanceBreakSettings {
  enabled: boolean;
  durationMinutes: number;
  minShiftHours: number;
}

export interface CompanySettings {
  timeZone: string;
  currency: string;
  attendanceBreak: AttendanceBreakSettings;
}

export const DEFAULT_ATTENDANCE_BREAK: AttendanceBreakSettings = {
  enabled: true,
  durationMinutes: 30,
  minShiftHours: 6,
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  timeZone: 'Australia/Sydney',
  currency: 'AUD',
  attendanceBreak: DEFAULT_ATTENDANCE_BREAK,
};
