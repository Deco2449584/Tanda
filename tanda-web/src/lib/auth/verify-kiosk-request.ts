import { COLLECTIONS } from '@/lib/constants';
import { verifyFirebaseToken } from '@/lib/auth/verify-firebase-token';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { getAdminFirestore } from '@/lib/firebase-admin';

export interface KioskAuthorizedUser {
  email: string;
  uid: string;
  role: 'admin' | 'kiosk' | 'empleado';
  /** Set when the requester is a dedicated kiosk (tablet) account. */
  isKioskAccount: boolean;
}

/**
 * Authorizes a Firebase user to manage/activate kiosk devices. Allowed:
 * dedicated `kiosk` role accounts, admins, or employees with `kioskEnabled`.
 */
export async function verifyKioskRequest(
  request: Request,
): Promise<KioskAuthorizedUser | null> {
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

  const kioskEnabled = data.kioskEnabled === true;

  if (role !== 'admin' && role !== 'kiosk' && !kioskEnabled) {
    return null;
  }

  return {
    email: user.email,
    uid: user.uid,
    role,
    isKioskAccount: role === 'kiosk',
  };
}
