import { COLLECTIONS } from '@/lib/constants';
import {
  validateCheckInRestrictions,
  type AttendanceRestrictionViolation,
} from '@/lib/attendance/attendance-restrictions';
import { writeAuditLog } from '@/lib/audit/server/audit-log-service';
import { toInputDateInTimeZone } from '@/lib/dates/timezone';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  DEFAULT_ATTENDANCE_RESTRICTIONS,
  DEFAULT_COMPANY_SETTINGS,
  type AttendanceRestrictionsSettings,
  type CompanySettings,
} from '@/lib/types/company-settings';

interface ShiftRow {
  date: string;
  startTime: string;
  endTime: string;
}

export async function loadCompanySettingsAdmin(): Promise<CompanySettings> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.SETTINGS)
    .doc('general')
    .get();

  if (!snapshot.exists) {
    return DEFAULT_COMPANY_SETTINGS;
  }

  const data = snapshot.data() ?? {};
  const policyRaw = data.attendancePolicy;
  const breakRaw = data.attendanceBreak;
  const restrictionsRaw = data.attendanceRestrictions;

  const attendancePolicy =
    policyRaw && typeof policyRaw === 'object'
      ? {
          gracePeriodMinutes:
            typeof (policyRaw as Record<string, unknown>).gracePeriodMinutes === 'number'
              ? ((policyRaw as Record<string, unknown>).gracePeriodMinutes as number)
              : DEFAULT_COMPANY_SETTINGS.attendancePolicy.gracePeriodMinutes,
          noShowAfterMinutes:
            typeof (policyRaw as Record<string, unknown>).noShowAfterMinutes === 'number'
              ? ((policyRaw as Record<string, unknown>).noShowAfterMinutes as number)
              : DEFAULT_COMPANY_SETTINGS.attendancePolicy.noShowAfterMinutes,
        }
      : DEFAULT_COMPANY_SETTINGS.attendancePolicy;

  const attendanceBreak =
    breakRaw && typeof breakRaw === 'object'
      ? {
          enabled:
            typeof (breakRaw as Record<string, unknown>).enabled === 'boolean'
              ? ((breakRaw as Record<string, unknown>).enabled as boolean)
              : DEFAULT_COMPANY_SETTINGS.attendanceBreak.enabled,
          durationMinutes:
            typeof (breakRaw as Record<string, unknown>).durationMinutes === 'number'
              ? ((breakRaw as Record<string, unknown>).durationMinutes as number)
              : DEFAULT_COMPANY_SETTINGS.attendanceBreak.durationMinutes,
          minShiftHours:
            typeof (breakRaw as Record<string, unknown>).minShiftHours === 'number'
              ? ((breakRaw as Record<string, unknown>).minShiftHours as number)
              : DEFAULT_COMPANY_SETTINGS.attendanceBreak.minShiftHours,
        }
      : DEFAULT_COMPANY_SETTINGS.attendanceBreak;

  const attendanceRestrictions = mapAttendanceRestrictions(restrictionsRaw);

  return {
    timeZone:
      typeof data.timeZone === 'string' ? data.timeZone : DEFAULT_COMPANY_SETTINGS.timeZone,
    currency:
      typeof data.currency === 'string' ? data.currency : DEFAULT_COMPANY_SETTINGS.currency,
    attendancePolicy,
    attendanceBreak,
    attendanceRestrictions,
  };
}

function mapAttendanceRestrictions(raw: unknown): AttendanceRestrictionsSettings {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_ATTENDANCE_RESTRICTIONS;
  }

  const value = raw as Record<string, unknown>;
  return {
    blockEarlyClockIn:
      typeof value.blockEarlyClockIn === 'boolean'
        ? value.blockEarlyClockIn
        : DEFAULT_ATTENDANCE_RESTRICTIONS.blockEarlyClockIn,
    blockEarlyClockInMinutes:
      typeof value.blockEarlyClockInMinutes === 'number' &&
      value.blockEarlyClockInMinutes >= 0
        ? value.blockEarlyClockInMinutes
        : DEFAULT_ATTENDANCE_RESTRICTIONS.blockEarlyClockInMinutes,
    blockUnscheduledShift:
      typeof value.blockUnscheduledShift === 'boolean'
        ? value.blockUnscheduledShift
        : DEFAULT_ATTENDANCE_RESTRICTIONS.blockUnscheduledShift,
  };
}

async function loadEmployeeShiftsOnDate(
  employeeId: string,
  date: string,
): Promise<ShiftRow[]> {
  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.SHIFTS)
    .where('employeeId', '==', employeeId.trim())
    .get();

  return snapshot.docs
    .map((document) => document.data())
    .filter((data) => data.date === date)
    .map((data) => ({
      date: typeof data.date === 'string' ? data.date : date,
      startTime: typeof data.startTime === 'string' ? data.startTime : '00:00',
      endTime: typeof data.endTime === 'string' ? data.endTime : '00:00',
    }));
}

export async function validateEmployeeCheckInRestrictions(input: {
  employeeId: string;
  punchAt: Date;
  overrideRestrictions?: boolean;
}): Promise<AttendanceRestrictionViolation | null> {
  if (input.overrideRestrictions) return null;

  const settings = await loadCompanySettingsAdmin();
  const date = toInputDateInTimeZone(settings.timeZone, input.punchAt);
  const shiftsOnDate = await loadEmployeeShiftsOnDate(input.employeeId, date);

  return validateCheckInRestrictions({
    restrictions: settings.attendanceRestrictions,
    timeZone: settings.timeZone,
    punchAt: input.punchAt,
    shiftsOnDate,
  });
}

export async function logAttendanceRestrictionBlocked(input: {
  actorEmail: string;
  actorUid?: string;
  employeeId: string;
  employeeName?: string;
  channel: 'kiosk' | 'admin_manual';
  violation: AttendanceRestrictionViolation;
  punchAt: Date;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await writeAuditLog({
      actorEmail: input.actorEmail,
      actorUid: input.actorUid,
      action: 'attendance.restriction_blocked',
      entityType: 'attendance_record',
      entityId: input.employeeId,
      summary: `Blocked ${input.violation.code.replace('_', ' ')} for ${input.employeeName ?? input.employeeId}`,
      before: null,
      after: {
        employeeId: input.employeeId,
        punchAt: input.punchAt.toISOString(),
        code: input.violation.code,
        channel: input.channel,
      },
      metadata: {
        message: input.violation.message,
        ...input.metadata,
      },
      ipAddress: input.ipAddress,
    });
  } catch (error) {
    console.error('logAttendanceRestrictionBlocked', error);
  }
}
