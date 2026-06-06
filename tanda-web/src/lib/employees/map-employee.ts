import type { Employee, EmployeeFirestore } from '@/lib/types/employee';

export function mapEmployeeDoc(
  id: string,
  data: Record<string, unknown>,
): Employee {
  const employee = data as Partial<EmployeeFirestore>;

  return {
    id,
    employeeId:
      typeof employee.employeeId === 'string' ? employee.employeeId.trim() : '',
    name: employee.name ?? 'No name',
    email:
      typeof employee.email === 'string'
        ? employee.email.trim().toLowerCase()
        : '',
    role: typeof employee.role === 'string' ? employee.role.trim() : undefined,
    department: employee.department ?? '',
    hourlyRate: typeof employee.hourlyRate === 'number' ? employee.hourlyRate : 0,
    active: employee.active ?? false,
    lastAction: employee.lastAction ?? 'none',
    lastTimestampServer: employee.lastTimestampServer,
    photoUrl: typeof employee.photoUrl === 'string' ? employee.photoUrl : '',
  };
}
