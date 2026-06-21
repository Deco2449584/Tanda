import { COLLECTIONS } from '@/lib/constants';
import { verifyFirebaseToken } from '@/lib/auth/verify-firebase-token';
import { getAdminFirestore } from '@/lib/firebase-admin';

export interface VerifiedEmployeeRequest {
  uid: string;
  email: string;
  employeeDocId: string;
}

export async function verifyEmployeeRequest(
  request: Request,
): Promise<VerifiedEmployeeRequest | null> {
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

  return {
    uid: user.uid,
    email: user.email,
    employeeDocId: snapshot.docs[0].id,
  };
}
