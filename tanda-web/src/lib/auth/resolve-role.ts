import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { UserRole } from '@/lib/auth/roles';

const ADMIN_ROLE_VALUES = new Set([
  'admin',
  'administrator',
  'administrador',
]);

/** Matches Continental Inspect / mobile admin departments. */
const ADMIN_DEPARTMENTS = new Set(['admin', 'logistica']);

export interface EmployeeRoleSource {
  role?: string;
  department?: string;
}

/** Resolves web access from Firestore employee `role` or `department` — not email. */
export function resolveRoleFromEmployee(
  source: EmployeeRoleSource | null | undefined,
): UserRole {
  if (!source) return 'empleado';

  const role = source.role?.trim().toLowerCase() ?? '';
  if (role === 'master') {
    return 'master';
  }
  if (role === 'kiosk') {
    return 'kiosk';
  }
  if (role && ADMIN_ROLE_VALUES.has(role)) {
    return 'admin';
  }

  const department = source.department?.trim().toLowerCase() ?? '';
  if (department && ADMIN_DEPARTMENTS.has(department)) {
    return 'admin';
  }

  return 'empleado';
}

export async function fetchUserRoleForEmail(
  email: string | null | undefined,
): Promise<UserRole> {
  if (!email?.trim() || !db) {
    return 'empleado';
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
    return 'empleado';
  }

  const data = snapshot.docs[0].data() as Record<string, unknown>;
  return resolveRoleFromEmployee({
    role: typeof data.role === 'string' ? data.role : undefined,
    department: typeof data.department === 'string' ? data.department : undefined,
  });
}