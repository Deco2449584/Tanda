import { shiftDurationHours } from '@/lib/dashboard/compute-metrics';
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

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(total);

  return { total, formatted };
}
