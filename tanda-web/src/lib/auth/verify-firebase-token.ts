import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
}

export async function verifyFirebaseToken(
  authorizationHeader: string | null,
): Promise<VerifiedFirebaseUser | null> {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const email = decoded.email?.trim().toLowerCase();

    if (!email) {
      return null;
    }

    return { uid: decoded.uid, email };
  } catch {
    return null;
  }
}
