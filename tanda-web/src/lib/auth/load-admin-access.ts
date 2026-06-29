import { COLLECTIONS } from '@/lib/constants';
import { mapAdminRoleDoc } from '@/lib/admin-roles/map-admin-role';
import { resolveAdminAccess } from '@/lib/auth/admin-permissions';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { verifyFirebaseToken } from '@/lib/auth/verify-firebase-token';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type {
  AdminModulePermissionsFirestore,
  ResolvedAdminAccess,
} from '@/lib/types/admin-permissions';

export async function loadAdminAccessFromRequest(
  request: Request,
): Promise<{ user: { email: string; uid: string }; access: ResolvedAdminAccess } | null> {
  const user = await verifyFirebaseToken(request.headers.get('authorization'));
  if (!user) {
    return null;
  }

  const snapshot = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .where('email', '==', user.email)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data();
  const role = resolveRoleFromEmployee({
    role: typeof data.role === 'string' ? data.role : undefined,
    department: typeof data.department === 'string' ? data.department : undefined,
  });

  let modulePermissions: AdminModulePermissionsFirestore | null =
    data.modulePermissions && typeof data.modulePermissions === 'object'
      ? (data.modulePermissions as AdminModulePermissionsFirestore)
      : null;

  const adminRoleId =
    typeof data.adminRoleId === 'string' ? data.adminRoleId.trim() : '';

  if (role === 'admin' && adminRoleId) {
    const roleSnapshot = await getAdminFirestore()
      .collection(COLLECTIONS.ADMIN_ROLES)
      .doc(adminRoleId)
      .get();

    if (roleSnapshot.exists) {
      const mapped = mapAdminRoleDoc(roleSnapshot.id, roleSnapshot.data() ?? {});
      if (mapped.active) {
        modulePermissions = mapped.modulePermissions;
      }
    }
  }

  const access = resolveAdminAccess({ role, modulePermissions });
  if (!access) {
    return null;
  }

  return { user, access };
}
