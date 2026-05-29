import { buildWorkSessions } from '@/lib/attendance/work-sessions';
import { shiftDurationHours } from '@/lib/dashboard/compute-metrics';
import type { AttendanceRecord } from '@/lib/types/attendance';
import type { Employee } from '@/lib/types/employee';
import type { Shift } from '@/lib/types/shift';

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

function formatCurrency(total: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(total);
}

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

  return { total, formatted: formatCurrency(total) };
}

/** Costo real: horas trabajadas hoy (check-in/out emparejados) × tarifa. */
export function computeActualPayrollKpi(
  employees: Employee[],
  todayAttendance: AttendanceRecord[],
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

    const hoursWorked = buildWorkSessions(records)
      .filter(
        (session) => session.status === 'complete' && session.hours !== null,
      )
      .reduce((sum, session) => sum + (session.hours ?? 0), 0);

    total += hoursWorked * employee.hourlyRate;
  });

  return { total, formatted: formatCurrency(total) };
}

export function computeDualPayrollKpi(
  employees: Employee[],
  todayShifts: Shift[],
  todayAttendance: AttendanceRecord[],
): DualPayrollKpi {
  return {
    projected: computeScheduledPayrollKpi(employees, todayShifts),
    actual: computeActualPayrollKpi(employees, todayAttendance),
  };
}
