import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { mapAdminRoleDoc } from '@/lib/admin-roles/map-admin-role';
import {
  getDefaultAdminHref,
  mapModulePermissions,
  resolveAdminAccess,
} from '@/lib/auth/admin-permissions';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { getHomeRouteForRole, type UserRole } from '@/lib/auth/roles';
import { COLLECTIONS } from '@/lib/constants';
import { db } from '@/lib/firebase';
import type { AdminModulePermissionsFirestore } from '@/lib/types/admin-permissions';

/**
 * Resolves where a user should land after sign-in.
 * Admins go to the first menu module their role allows (not always Dashboard).
 */
export async function resolvePostLoginHref(
  email: string | null | undefined,
  role?: UserRole | null,
): Promise<string> {
  const normalizedEmail = email?.trim().toLowerCase() ?? '';

  if (!normalizedEmail || !db) {
    return role ? getHomeRouteForRole(role) : '/login';
  }

  try {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.EMPLOYEES),
        where('email', '==', normalizedEmail),
        limit(1),
      ),
    );

    if (snapshot.empty) {
      return role ? getHomeRouteForRole(role) : '/login';
    }

    const data = snapshot.docs[0].data() as Record<string, unknown>;
    const resolvedRole =
      role ??
      resolveRoleFromEmployee({
        role: typeof data.role === 'string' ? data.role : undefined,
        department:
          typeof data.department === 'string' ? data.department : undefined,
      });

    if (resolvedRole !== 'admin') {
      return getHomeRouteForRole(resolvedRole);
    }

    const adminRoleId =
      typeof data.adminRoleId === 'string' ? data.adminRoleId.trim() : '';
    let modulePermissions: AdminModulePermissionsFirestore | null =
      data.modulePermissions && typeof data.modulePermissions === 'object'
        ? mapModulePermissions(
            data.modulePermissions as AdminModulePermissionsFirestore,
          )
        : null;

    if (adminRoleId) {
      const roleSnap = await getDoc(doc(db, COLLECTIONS.ADMIN_ROLES, adminRoleId));
      if (roleSnap.exists()) {
        const mapped = mapAdminRoleDoc(roleSnap.id, roleSnap.data());
        if (mapped.active) {
          modulePermissions = mapModulePermissions(mapped.modulePermissions);
        }
      }
    }

    const access = resolveAdminAccess({
      role: 'admin',
      modulePermissions,
    });

    return access ? getDefaultAdminHref(access) : getHomeRouteForRole('admin');
  } catch (error) {
    console.error('resolvePostLoginHref', error);
    return role ? getHomeRouteForRole(role) : '/login';
  }
}
