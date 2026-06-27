import {
  calculateWorkedHoursInRange,
} from '@/lib/attendance/work-sessions';
import { buildPayrollReport } from '@/lib/attendance/export-payroll-csv';
import { formatRecordDate } from '@/lib/attendance/format';
import type { DateRange } from '@/lib/attendance/date-range';
import { normalizeInputDate, toInputDate } from '@/lib/dates/input-date';
import {
  computeLateAlerts,
  computeNoShowsToday,
  shiftDurationHours,
} from '@/lib/dashboard/compute-metrics';
import {
  filterAttendanceByEmployees,
  filterEmployeesByLocation,
  filterShiftsForDashboard,
  getSiteKeyForEmployee,
  getSiteKeyForShift,
} from '@/lib/dashboard/filter-dashboard-data';
import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';
import type {
  GroupedBarDatum,
  NamedValueDatum,
  ShiftLoadDatum,
  WeeklyHoursDatum,
} from '@/lib/dashboard/types';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type {
  AttendanceBreakSettings,
  AttendancePolicySettings,
} from '@/lib/types/company-settings';
import type { Employee } from '@/lib/types/employee';
import type { LeaveRequest } from '@/lib/types/leave-request';
import type { Location } from '@/lib/types/location';
import type { LocationGroup } from '@/lib/types/location-group';
import type { Shift } from '@/lib/types/shift';

export interface DashboardAnalyticsInput {
  employees: Employee[];
  shifts: Shift[];
  attendance: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  locations: Location[];
  groups: LocationGroup[];
  dateRange: DateRange;
  locationFilter: string;
  attendanceBreak: AttendanceBreakSettings;
  attendancePolicy: AttendancePolicySettings;
  timeZone: string;
  currency: string;
}

export interface DashboardAnalytics {
  payrollByLocation: NamedValueDatum[];
  projectedPayrollByLocation: NamedValueDatum[];
  hoursWorkedByLocation: NamedValueDatum[];
  scheduledVsActualByLocation: GroupedBarDatum[];
  dailyPayrollTrend: NamedValueDatum[];
  weeklyHours: WeeklyHoursDatum[];
  shiftLoadByDepartment: ShiftLoadDatum[];
  shiftsByLocation: NamedValueDatum[];
  lateArrivalsByLocation: NamedValueDatum[];
  noShowsByLocation: NamedValueDatum[];
  headcountByLocation: NamedValueDatum[];
  leaveByType: NamedValueDatum[];
  attendanceComplianceByLocation: NamedValueDatum[];
  payrollTotal: number;
  projectedPayrollTotal: number;
  lateAlertsTotal: number;
  noShowsTotal: number;
  pendingLeaveTotal: number;
  activeStaffLabel: string;
  payrollActualFormatted: string;
  payrollProjectedFormatted: string;
}

function eachDayInRange(range: DateRange): string[] {
  const days: string[] = [];
  const current = new Date(`${range.start}T12:00:00`);
  const end = new Date(`${range.end}T12:00:00`);

  while (current <= end) {
    days.push(toInputDate(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function formatDayLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function aggregateByKey(
  entries: Array<{ key: string; value: number }>,
): NamedValueDatum[] {
  const totals = new Map<string, number>();

  entries.forEach(({ key, value }) => {
    totals.set(key, (totals.get(key) ?? 0) + value);
  });

  return Array.from(totals.entries())
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function filterRecordsForDay(
  records: AttendanceRecord[],
  day: string,
): AttendanceRecord[] {
  return records.filter(
    (record) => formatRecordDate(record.timestampServer) === day,
  );
}

function computeLateAlertsInRange(
  shifts: Shift[],
  attendance: AttendanceRecord[],
  options: {
    policy: AttendancePolicySettings;
    timeZone: string;
  },
): number {
  const days = new Set(shifts.map((shift) => normalizeInputDate(shift.date)));
  let total = 0;

  days.forEach((day) => {
    const dayShifts = shifts.filter(
      (shift) => normalizeInputDate(shift.date) === day,
    );
    const dayRecords = filterRecordsForDay(attendance, day);
    total += computeLateAlerts(dayShifts, dayRecords, options);
  });

  return total;
}

function computeNoShowsInRange(
  shifts: Shift[],
  attendance: AttendanceRecord[],
  options: {
    policy: AttendancePolicySettings;
    timeZone: string;
  },
): number {
  const days = new Set(shifts.map((shift) => normalizeInputDate(shift.date)));
  let total = 0;

  days.forEach((day) => {
    const dayShifts = shifts.filter(
      (shift) => normalizeInputDate(shift.date) === day,
    );
    const dayRecords = filterRecordsForDay(attendance, day);
    total += computeNoShowsToday(dayShifts, dayRecords, options);
  });

  return total;
}

function buildLateArrivalsByLocation(
  shifts: Shift[],
  attendance: AttendanceRecord[],
  locations: Location[],
  options: {
    policy: AttendancePolicySettings;
    timeZone: string;
  },
): NamedValueDatum[] {
  const days = new Set(shifts.map((shift) => normalizeInputDate(shift.date)));
  const entries: Array<{ key: string; value: number }> = [];

  days.forEach((day) => {
    const dayShifts = shifts.filter(
      (shift) => normalizeInputDate(shift.date) === day,
    );
    const dayRecords = filterRecordsForDay(attendance, day);

    dayShifts.forEach((shift) => {
      const dayShiftRecords = dayRecords.filter(
        (record) => record.employeeId === shift.employeeId,
      );
      const lateCount = computeLateAlerts([shift], dayShiftRecords, options);
      if (lateCount > 0) {
        entries.push({
          key: getSiteKeyForShift(shift, locations),
          value: lateCount,
        });
      }
    });
  });

  return aggregateByKey(entries);
}

function buildNoShowsByLocation(
  shifts: Shift[],
  attendance: AttendanceRecord[],
  locations: Location[],
  options: {
    policy: AttendancePolicySettings;
    timeZone: string;
  },
): NamedValueDatum[] {
  const days = new Set(shifts.map((shift) => normalizeInputDate(shift.date)));
  const entries: Array<{ key: string; value: number }> = [];

  days.forEach((day) => {
    const dayShifts = shifts.filter(
      (shift) => normalizeInputDate(shift.date) === day,
    );
    const dayRecords = filterRecordsForDay(attendance, day);

    dayShifts.forEach((shift) => {
      const dayShiftRecords = dayRecords.filter(
        (record) => record.employeeId === shift.employeeId,
      );
      const noShowCount = computeNoShowsToday(
        [shift],
        dayShiftRecords,
        options,
      );
      if (noShowCount > 0) {
        entries.push({
          key: getSiteKeyForShift(shift, locations),
          value: noShowCount,
        });
      }
    });
  });

  return aggregateByKey(entries);
}

function buildAttendanceComplianceByLocation(
  shifts: Shift[],
  attendance: AttendanceRecord[],
  locations: Location[],
  options: {
    policy: AttendancePolicySettings;
    timeZone: string;
  },
): NamedValueDatum[] {
  const days = new Set(shifts.map((shift) => normalizeInputDate(shift.date)));
  const totals = new Map<string, { onTime: number; total: number }>();

  days.forEach((day) => {
    const dayShifts = shifts.filter(
      (shift) => normalizeInputDate(shift.date) === day,
    );
    const dayRecords = filterRecordsForDay(attendance, day);

    dayShifts.forEach((shift) => {
      const site = getSiteKeyForShift(shift, locations);
      const current = totals.get(site) ?? { onTime: 0, total: 0 };
      current.total += 1;

      const dayShiftRecords = dayRecords.filter(
        (record) => record.employeeId === shift.employeeId,
      );
      const lateCount = computeLateAlerts([shift], dayShiftRecords, options);
      if (lateCount === 0) {
        current.onTime += 1;
      }

      totals.set(site, current);
    });
  });

  return Array.from(totals.entries())
    .map(([name, stats]) => ({
      name,
      value:
        stats.total > 0
          ? Math.round((stats.onTime / stats.total) * 1000) / 10
          : 0,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function buildDailyPayrollTrend(
  employees: Employee[],
  attendance: AttendanceRecord[],
  dateRange: DateRange,
  options: {
    currency: string;
    attendanceBreak: AttendanceBreakSettings;
  },
): NamedValueDatum[] {
  const days = eachDayInRange(dateRange);

  return days
    .map((day) => {
      const dayRecords = filterRecordsForDay(attendance, day);
      const report = buildPayrollReport(dayRecords, employees, {
        start: day,
        end: day,
      }, {
        currency: options.currency,
        attendanceBreak: options.attendanceBreak,
      });

      return {
        name: formatDayLabel(day),
        value: report.totals.grossPay,
      };
    })
    .filter((item) => item.value > 0);
}

function buildScheduledVsActualByLocation(
  employees: Employee[],
  shifts: Shift[],
  attendance: AttendanceRecord[],
  dateRange: DateRange,
  locations: Location[],
  attendanceBreak: AttendanceBreakSettings,
): GroupedBarDatum[] {
  const scheduled = new Map<string, number>();
  const actual = new Map<string, number>();

  shifts.forEach((shift) => {
    const site = getSiteKeyForShift(shift, locations);
    const hours = shiftDurationHours(shift.startTime, shift.endTime);
    scheduled.set(site, (scheduled.get(site) ?? 0) + hours);
  });

  employees.forEach((employee) => {
    const employeeRecords = attendance.filter(
      (record) => record.employeeId === employee.employeeId,
    );
    const hours = calculateWorkedHoursInRange(
      employeeRecords,
      dateRange.start,
      dateRange.end,
      attendanceBreak,
    );
    if (hours <= 0) return;

    const site = getSiteKeyForEmployee(employee, locations);
    actual.set(site, (actual.get(site) ?? 0) + hours);
  });

  const sites = new Set([...scheduled.keys(), ...actual.keys()]);

  return Array.from(sites)
    .map((name) => ({
      name,
      scheduled: Math.round((scheduled.get(name) ?? 0) * 10) / 10,
      actual: Math.round((actual.get(name) ?? 0) * 10) / 10,
    }))
    .filter((item) => item.scheduled > 0 || item.actual > 0)
    .sort((a, b) => b.actual - a.actual);
}

export function computeDashboardAnalytics(
  input: DashboardAnalyticsInput,
): DashboardAnalytics {
  const filteredEmployees = filterEmployeesByLocation(
    input.employees.filter((employee) => employee.active),
    input.locationFilter,
    input.groups,
  );
  const employeesById = new Map(
    filteredEmployees.map((employee) => [employee.employeeId, employee]),
  );
  const allowedEmployeeIds = new Set(
    filteredEmployees.map((employee) => employee.employeeId),
  );

  const attendance = filterAttendanceByEmployees(
    input.attendance,
    allowedEmployeeIds,
  );
  const shifts = filterShiftsForDashboard(
    input.shifts,
    employeesById,
    input.locationFilter,
    input.groups,
  );

  const policyOptions = {
    policy: input.attendancePolicy,
    timeZone: input.timeZone,
  };

  const payrollReport = buildPayrollReport(
    attendance,
    filteredEmployees,
    input.dateRange,
    {
      currency: input.currency,
      attendanceBreak: input.attendanceBreak,
    },
  );

  const employeeById = new Map(
    filteredEmployees.map((employee) => [employee.employeeId, employee]),
  );

  const payrollByLocation = aggregateByKey(
    payrollReport.rows.map((row) => {
      const employee = employeeById.get(row.employeeId);
      const key = employee
        ? getSiteKeyForEmployee(employee, input.locations)
        : 'Unknown';
      return { key, value: row.grossPay };
    }),
  );

  const projectedPayrollByLocation = aggregateByKey(
    shifts.map((shift) => {
      const employee = employeesById.get(shift.employeeId);
      if (!employee) return { key: 'Unknown', value: 0 };
      const hours = shiftDurationHours(shift.startTime, shift.endTime);
      return {
        key: getSiteKeyForShift(shift, input.locations),
        value: employee.hourlyRate * hours,
      };
    }),
  );

  const hoursWorkedByLocation = aggregateByKey(
    filteredEmployees.map((employee) => {
      const employeeRecords = attendance.filter(
        (record) => record.employeeId === employee.employeeId,
      );
      const hours = calculateWorkedHoursInRange(
        employeeRecords,
        input.dateRange.start,
        input.dateRange.end,
        input.attendanceBreak,
      );
      return {
        key: getSiteKeyForEmployee(employee, input.locations),
        value: hours,
      };
    }),
  );

  const scheduledVsActualByLocation = buildScheduledVsActualByLocation(
    filteredEmployees,
    shifts,
    attendance,
    input.dateRange,
    input.locations,
    input.attendanceBreak,
  );

  const dailyPayrollTrend = buildDailyPayrollTrend(
    filteredEmployees,
    attendance,
    input.dateRange,
    {
      currency: input.currency,
      attendanceBreak: input.attendanceBreak,
    },
  );

  const days = eachDayInRange(input.dateRange);
  const weeklyHours: WeeklyHoursDatum[] = days.map((day) => {
    const dayShifts = shifts.filter(
      (shift) => normalizeInputDate(shift.date) === day,
    );
    const horas = dayShifts.reduce(
      (sum, shift) => sum + shiftDurationHours(shift.startTime, shift.endTime),
      0,
    );

    return {
      day: formatDayLabel(day),
      horas: Math.round(horas * 10) / 10,
    };
  });

  const shiftLoadByDepartment: ShiftLoadDatum[] = (() => {
    const counts = new Map<string, number>();
    shifts.forEach((shift) => {
      const department = shift.department.trim() || 'No department';
      counts.set(department, (counts.get(department) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([department, turnos]) => ({ department, turnos }))
      .sort((a, b) => b.turnos - a.turnos);
  })();

  const shiftsByLocation = aggregateByKey(
    shifts.map((shift) => ({
      key: getSiteKeyForShift(shift, input.locations),
      value: 1,
    })),
  );

  const lateArrivalsByLocation = buildLateArrivalsByLocation(
    shifts,
    attendance,
    input.locations,
    policyOptions,
  );

  const noShowsByLocation = buildNoShowsByLocation(
    shifts,
    attendance,
    input.locations,
    policyOptions,
  );

  const headcountByLocation = aggregateByKey(
    filteredEmployees.map((employee) => ({
      key: getSiteKeyForEmployee(employee, input.locations),
      value: 1,
    })),
  );

  const leaveByType = aggregateByKey(
    input.leaveRequests
      .filter((request) => request.status === 'Pending')
      .map((request) => ({
        key: request.type?.trim() || 'Other',
        value: 1,
      })),
  );

  const attendanceComplianceByLocation = buildAttendanceComplianceByLocation(
    shifts,
    attendance,
    input.locations,
    policyOptions,
  );

  const projectedPayrollTotal = projectedPayrollByLocation.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const checkedIn = filteredEmployees.filter(
    (employee) => employee.lastAction === 'check_in',
  );

  return {
    payrollByLocation,
    projectedPayrollByLocation,
    hoursWorkedByLocation,
    scheduledVsActualByLocation,
    dailyPayrollTrend,
    weeklyHours,
    shiftLoadByDepartment,
    shiftsByLocation,
    lateArrivalsByLocation,
    noShowsByLocation,
    headcountByLocation,
    leaveByType,
    attendanceComplianceByLocation,
    payrollTotal: payrollReport.totals.grossPay,
    projectedPayrollTotal,
    lateAlertsTotal: computeLateAlertsInRange(
      shifts,
      attendance,
      policyOptions,
    ),
    noShowsTotal: computeNoShowsInRange(shifts, attendance, policyOptions),
    pendingLeaveTotal: input.leaveRequests.filter(
      (request) => request.status === 'Pending',
    ).length,
    activeStaffLabel: `${checkedIn.length}/${filteredEmployees.length}`,
    payrollActualFormatted: formatDashboardCurrency(
      payrollReport.totals.grossPay,
      input.currency,
    ),
    payrollProjectedFormatted: formatDashboardCurrency(
      projectedPayrollTotal,
      input.currency,
    ),
  };
}
