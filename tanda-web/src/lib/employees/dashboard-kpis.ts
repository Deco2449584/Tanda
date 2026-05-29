import type { Employee } from '@/lib/types/employee';

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

export function computePayrollKpi(employees: Employee[]): PayrollKpi {
  const checkedIn = employees.filter(
    (employee) => employee.lastAction === 'check_in',
  );

  const total = checkedIn.reduce(
    (sum, employee) => sum + employee.hourlyRate,
    0,
  ) * 8;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(total);

  return { total, formatted };
}
