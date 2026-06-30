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

export interface AttendanceRestrictionsSettings {
  /** Reject check-ins earlier than X minutes before the scheduled shift start. */
  blockEarlyClockIn: boolean;
  blockEarlyClockInMinutes: number;
  /** Reject check-ins when the employee has no shift on that date. */
  blockUnscheduledShift: boolean;
}

export interface CompanySettings {
  timeZone: string;
  currency: string;
  /** Pre-selected department name when creating new employees. */
  defaultDepartmentName?: string;
  attendanceBreak: AttendanceBreakSettings;
  attendancePolicy: AttendancePolicySettings;
  attendanceRestrictions: AttendanceRestrictionsSettings;
  /** When false, no browser push is sent company-wide. Master-only setting. */
  pushNotificationsEnabled?: boolean;
  /** Custom help tutorial video categories (merged with defaults and in-use values). */
  helpTutorialCategories?: string[];
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

export const DEFAULT_ATTENDANCE_RESTRICTIONS: AttendanceRestrictionsSettings = {
  blockEarlyClockIn: false,
  blockEarlyClockInMinutes: 15,
  blockUnscheduledShift: false,
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  timeZone: 'Australia/Sydney',
  currency: 'AUD',
  attendanceBreak: DEFAULT_ATTENDANCE_BREAK,
  attendancePolicy: DEFAULT_ATTENDANCE_POLICY,
  attendanceRestrictions: DEFAULT_ATTENDANCE_RESTRICTIONS,
  pushNotificationsEnabled: true,
};
