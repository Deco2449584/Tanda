import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import type { EmployeeAccessRole } from '@/lib/employees/request-admin-access';
import { initialCreateEmployeeForm } from '@/lib/employees/build-create-payload';
import type { CreateEmployeeFormValues, Employee } from '@/lib/types/employee';

export function deriveAccessRole(employee: Employee): EmployeeAccessRole {
  const raw = employee.role?.trim().toLowerCase();
  if (raw === 'master') return 'master';
  if (raw === 'admin') return 'admin';
  if (raw === 'kiosk') return 'kiosk';
  if (resolveRoleFromEmployee(employee) === 'admin') return 'admin';
  return 'empleado';
}

export function employeeToFormValues(employee: Employee): CreateEmployeeFormValues {
  return {
    ...initialCreateEmployeeForm,
    employeeId: employee.employeeId ?? '',
    name: employee.name ?? '',
    email: employee.email ?? '',
    department: employee.department ?? '',
    locationId: employee.locationId ?? '',
    locationGroupId: employee.locationGroupId ?? '',
    hourlyRate: employee.hourlyRate ?? 0,
    startDate: employee.startDate ?? '',
    endDate: employee.endDate ?? '',
    phone: employee.phone ?? '',
    dateOfBirth: employee.dateOfBirth ?? '',
    addressLine1: employee.addressLine1 ?? '',
    addressLine2: employee.addressLine2 ?? '',
    city: employee.city ?? '',
    state: employee.state ?? '',
    postcode: employee.postcode ?? '',
    country: employee.country ?? '',
    emergencyContactName: employee.emergencyContactName ?? '',
    emergencyContactPhone: employee.emergencyContactPhone ?? '',
    passportNumber: employee.passportNumber ?? '',
    visaExpiry: employee.visaExpiry ?? '',
  };
}
