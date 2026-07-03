import { FieldValue } from 'firebase-admin/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { getAdminFirestore } from '@/lib/firebase-admin';

function authSessionRef(uid: string) {
  return getAdminFirestore().collection(COLLECTIONS.AUTH_SESSIONS).doc(uid);
}

export async function claimAuthSessionRecord(
  uid: string,
  sessionId: string,
  metadata?: { userAgent?: string },
): Promise<void> {
  await authSessionRef(uid).set(
    {
      sessionId,
      updatedAt: FieldValue.serverTimestamp(),
      ...(metadata?.userAgent ? { userAgent: metadata.userAgent } : {}),
    },
    { merge: true },
  );
}

export async function releaseAuthSessionRecord(
  uid: string,
  sessionId: string,
): Promise<void> {
  const ref = authSessionRef(uid);
  const db = getAdminFirestore();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return;

    const activeSessionId = snapshot.data()?.sessionId;
    if (typeof activeSessionId === 'string' && activeSessionId === sessionId) {
      transaction.delete(ref);
    }
  });
}
