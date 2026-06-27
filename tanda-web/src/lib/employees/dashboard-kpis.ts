import { buildWorkSessions } from '@/lib/attendance/work-sessions';
import { shiftDurationHours } from '@/lib/dashboard/compute-metrics';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';
import type { Shift } from '@/lib/types/shift';
import {
  DEFAULT_ATTENDANCE_BREAK,
  type AttendanceBreakSettings,
} from '@/lib/types/company-settings';

export interface ActiveStaffKpi {
  checkedIn: number;
  totalActive: number;
  label: string;
}

export interface PayrollKpi {
  total: number;
  formatted: string;
}

export interface DualPayrollKpi {
  projected: PayrollKpi;
  actual: PayrollKpi;
}

import { formatDashboardCurrency } from '@/lib/dashboard/format-currency';

export function computeActiveStaffKpi(employees: Employee[]): ActiveStaffKpi {
  const activeEmployees = employees.filter((employee) => employee.active);
  const checkedIn = activeEmployees.filter(
    (employee) => employee.lastAction === 'check_in',
  );

  return {
    checkedIn: checkedIn.length,
    totalActive: activeEmployees.length,
    label: `${checkedIn.length}/${activeEmployees.length}`,
  };
}

/** Costo estimado: turnos de hoy × tarifa × horas programadas del turno. */
export function computeScheduledPayrollKpi(
  employees: Employee[],
  todayShifts: Shift[],
  currency = 'AUD',
): PayrollKpi {
  const employeesByCode = new Map(
    employees.map((employee) => [employee.employeeId, employee]),
  );

  const total = todayShifts.reduce((sum, shift) => {
    const employee = employeesByCode.get(shift.employeeId);
    if (!employee) return sum;

    const hours = shiftDurationHours(shift.startTime, shift.endTime);
    return sum + employee.hourlyRate * hours;
  }, 0);

  return { total, formatted: formatDashboardCurrency(total, currency) };
}

/** Costo real: horas trabajadas hoy (check-in/out emparejados) × tarifa. */
export function computeActualPayrollKpi(
  employees: Employee[],
  todayAttendance: AttendanceRecord[],
  attendanceBreak: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
  currency = 'AUD',
): PayrollKpi {
  const employeesByCode = new Map(
    employees.map((employee) => [employee.employeeId, employee]),
  );

  const recordsByEmployee = new Map<string, AttendanceRecord[]>();
  todayAttendance.forEach((record) => {
    const existing = recordsByEmployee.get(record.employeeId) ?? [];
    existing.push(record);
    recordsByEmployee.set(record.employeeId, existing);
  });

  let total = 0;

  recordsByEmployee.forEach((records, employeeId) => {
    const employee = employeesByCode.get(employeeId);
    if (!employee) return;

    const hoursWorked = buildWorkSessions(records, attendanceBreak)
      .filter(
        (session) => session.status === 'complete' && session.billableHours !== null,
      )
      .reduce((sum, session) => sum + (session.billableHours ?? 0), 0);

    total += hoursWorked * employee.hourlyRate;
  });

  return { total, formatted: formatDashboardCurrency(total, currency) };
}

export function computeDualPayrollKpi(
  employees: Employee[],
  todayShifts: Shift[],
  todayAttendance: AttendanceRecord[],
  attendanceBreak: AttendanceBreakSettings = DEFAULT_ATTENDANCE_BREAK,
  currency = 'AUD',
): DualPayrollKpi {
  return {
    projected: computeScheduledPayrollKpi(employees, todayShifts, currency),
    actual: computeActualPayrollKpi(
      employees,
      todayAttendance,
      attendanceBreak,
      currency,
    ),
  };
}
