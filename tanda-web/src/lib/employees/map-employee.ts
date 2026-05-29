import type { Employee, EmployeeFirestore } from '@/lib/types/employee';

export function mapEmployeeDoc(
  id: string,
  data: Record<string, unknown>,
): Employee {
  const employee = data as Partial<EmployeeFirestore>;

  return {
    id,
    employeeId: typeof employee.employeeId === 'string' ? employee.employeeId : '',
    name: employee.name ?? 'Sin nombre',
    email: employee.email ?? '',
    department: employee.department ?? '',
    hourlyRate: typeof employee.hourlyRate === 'number' ? employee.hourlyRate : 0,
    active: employee.active ?? false,
    lastAction: employee.lastAction ?? 'none',
    lastTimestampServer: employee.lastTimestampServer,
  };
}
