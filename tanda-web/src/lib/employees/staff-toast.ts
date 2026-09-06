import type { EmployeeAccessRole } from '@/lib/employees/request-admin-access';

export type StaffToastKind = EmployeeAccessRole;

export function staffToastMessage(
  action: 'created' | 'updated',
  kind: string | null | undefined,
): string {
  const verb = action === 'created' ? 'created' : 'updated';

  switch (kind) {
    case 'kiosk':
      return `Kiosk account ${verb} successfully.`;
    case 'admin':
      return `Administrator account ${verb} successfully.`;
    case 'master':
      return `Master account ${verb} successfully.`;
    case 'empleado':
    default:
      return `Employee ${verb} successfully.`;
  }
}
