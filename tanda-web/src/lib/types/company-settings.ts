export const COMPANY_NAME = 'Continental Cargo';

export interface AttendanceBreakSettings {
  enabled: boolean;
  durationMinutes: number;
  minShiftHours: number;
}

export interface AttendancePolicySettings {
  /** Minutes after shift start before a check-in counts as late. */
  gracePeriodMinutes: number;
  /** Minutes after shift start with no check-in before a no-show is flagged. */
  noShowAfterMinutes: number;
}

export interface CompanySettings {
  timeZone: string;
  currency: string;
  attendanceBreak: AttendanceBreakSettings;
  attendancePolicy: AttendancePolicySettings;
}

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicySettings = {
  gracePeriodMinutes: 10,
  noShowAfterMinutes: 60,
};

export const DEFAULT_ATTENDANCE_BREAK: AttendanceBreakSettings = {
  enabled: true,
  durationMinutes: 30,
  minShiftHours: 6,
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  timeZone: 'Australia/Sydney',
  currency: 'AUD',
  attendanceBreak: DEFAULT_ATTENDANCE_BREAK,
  attendancePolicy: DEFAULT_ATTENDANCE_POLICY,
};
