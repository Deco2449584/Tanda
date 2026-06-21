import { COLLECTIONS } from '@/lib/constants';
import { verifyFirebaseToken } from '@/lib/auth/verify-firebase-token';
import { resolveRoleFromEmployee } from '@/lib/auth/resolve-role';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function verifyAdminRequest(
  request: Request,
): Promise<{ email: string; uid: string } | null> {
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

  if (role !== 'admin') {
    return null;
  }

  return user;
}
