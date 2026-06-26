import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import type { UserRole } from '@/lib/auth/roles';
import { db } from '@/lib/firebase';

export interface EmployeeSession {
  role: UserRole;
  hasProfile: boolean;
  active: boolean;
}

export async function fetchEmployeeSessionForEmail(
  email: string | null | undefined,
): Promise<EmployeeSession> {
  if (!email?.trim() || !db) {
    return { role: 'empleado', hasProfile: false, active: false };
  }

  const normalized = email.trim().toLowerCase();
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.EMPLOYEES),
      where('email', '==', normalized),
      limit(1),
    ),
  );

  if (snapshot.empty) {
    return { role: 'empleado', hasProfile: false, active: false };
  }

  const data = snapshot.docs[0].data() as Record<string, unknown>;
  return {
    role: resolveRoleFromEmployee({
      role: typeof data.role === 'string' ? data.role : undefined,
      department: typeof data.department === 'string' ? data.department : undefined,
    }),
    hasProfile: true,
    active: data.active !== false,
  };
}

export function getEmployeeSessionBlockMessage(session: EmployeeSession): string | null {
  if (!session.hasProfile) {
    return 'No employee profile is linked to this account. Contact your administrator.';
  }

  if (!session.active) {
    return 'Your account has been deactivated. Contact your administrator.';
  }

  return null;
}
