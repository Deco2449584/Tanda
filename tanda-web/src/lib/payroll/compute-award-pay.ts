import { buildWorkSessionsFromRecords, type WorkSession } from '@/lib/attendance/work-sessions';
import type { DateRange } from '@/lib/attendance/date-range';
import { dateFromWallClock } from '@/lib/dates/timezone';
import { shiftDurationHours } from '@/lib/dashboard/compute-metrics';
import { buildAwardReport } from '@/lib/payroll/award-calc';
import { mapPayRules } from '@/lib/payroll/map-pay-rules';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type {
  AttendanceBreakSettings,
  PayrollAccountingSettings,
} from '@/lib/types/company-settings';
import type { Employee } from '@/lib/types/employee';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Location } from '@/lib/types/location';
import type { PayRules } from '@/lib/types/pay-rules';
import type { Shift } from '@/lib/types/shift';

function fakeTimestamp(date: Date) {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
  };
}

function fakeRecord(
  id: string,
  employee: Employee,
  type: 'check_in' | 'check_out',
  at: Date,
  shift: Shift,
): AttendanceRecord {
  return {
    id,
    employeeId: employee.employeeId,
    employeeNameSnapshot: employee.name,
    type,
    timestampServer: fakeTimestamp(at) as AttendanceRecord['timestampServer'],
    photoUrl: '',
    source: 'projected_shift',
    locationId: shift.locationId,
    locationNameSnapshot: shift.locationNameSnapshot,
  };
}

export function resolvePayRules(
  payRules?: PayRules,
  payrollAccounting?: PayrollAccountingSettings,
): PayRules {
  return mapPayRules(payRules, payrollAccounting);
}

export function buildSessionsFromShifts(input: {
  shifts: Shift[];
  employees: Employee[];
  timeZone: string;
  attendanceBreak: AttendanceBreakSettings;
}): WorkSession[] {
  const employeeByCode = new Map(
    input.employees.map((employee) => [employee.employeeId, employee]),
  );

  return input.shifts.flatMap((shift) => {
    const employee = employeeByCode.get(shift.employeeId);
    if (!employee) return [];

    const start = dateFromWallClock(shift.date, shift.startTime, input.timeZone);
    let end = dateFromWallClock(shift.date, shift.endTime, input.timeZone);
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    const clockHours = (end.getTime() - start.getTime()) / 3_600_000;
    const durationHours = shiftDurationHours(shift.startTime, shift.endTime);
    let billableHours = durationHours;
    if (
      input.attendanceBreak.enabled &&
      durationHours >= input.attendanceBreak.minShiftHours
    ) {
      billableHours = Math.max(
        0,
        durationHours - input.attendanceBreak.durationMinutes / 60,
      );
    }

    return [
      {
        checkIn: fakeRecord(`proj-${shift.id}-in`, employee, 'check_in', start, shift),
        checkOut: fakeRecord(`proj-${shift.id}-out`, employee, 'check_out', end, shift),
        hours: clockHours,
        billableHours,
        status: 'complete' as const,
      },
    ];
  });
}

export function computeAwardPay(input: {
  employees: Employee[];
  records?: AttendanceRecord[];
  sessions?: WorkSession[];
  locations: Location[];
  shifts?: Shift[];
  leaveRequests?: LeaveRequest[];
  dateRange: DateRange;
  payRules?: PayRules;
  payrollAccounting?: PayrollAccountingSettings;
  timeZone: string;
  attendanceBreak: AttendanceBreakSettings;
}) {
  const rules = resolvePayRules(input.payRules, input.payrollAccounting);
  const sessions =
    input.sessions ??
    buildWorkSessionsFromRecords(input.records ?? [], input.attendanceBreak);

  const report = buildAwardReport({
    rules,
    timeZone: input.timeZone,
    employees: input.employees,
    locations: input.locations,
    sessions,
    shifts: input.shifts,
    dateRange: input.dateRange,
    leaveRequests: input.leaveRequests,
  });

  return {
    payHours: report.totals.payHours,
    payAmount: report.totals.payAmount,
    report,
  };
}
