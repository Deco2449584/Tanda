import { auth } from '@/lib/firebase';
import type { AdminModulePermissionsFirestore } from '@/lib/types/admin-permissions';

export type EmployeeAccessRole = 'master' | 'admin' | 'kiosk' | 'empleado';

export async function requestEmployeeAdminAccess(input: {
  employeeDocId: string;
  accessRole: EmployeeAccessRole;
  modulePermissions?: AdminModulePermissionsFirestore;
}): Promise<void> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Your session expired. Sign in again and retry.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/employees/admin-access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not update admin access for this employee.');
  }
}
