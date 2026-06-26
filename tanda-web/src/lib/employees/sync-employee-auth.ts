import { COLLECTIONS } from '@/lib/constants';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

async function resolveAuthUidForEmployee(employeeDocId: string): Promise<string | null> {
  const employeeDoc = await getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(employeeDocId)
    .get();

  if (!employeeDoc.exists) {
    return null;
  }

  const data = employeeDoc.data() ?? {};
  const authUid = typeof data.authUid === 'string' ? data.authUid.trim() : '';
  if (authUid) {
    return authUid;
  }

  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!email) {
    return null;
  }

  try {
    const user = await getAdminAuth().getUserByEmail(email);
    return user.uid;
  } catch {
    return null;
  }
}

export async function disableEmployeeAuth(employeeDocId: string): Promise<void> {
  const uid = await resolveAuthUidForEmployee(employeeDocId);
  if (!uid) return;

  await getAdminAuth().updateUser(uid, { disabled: true });
}

export async function enableEmployeeAuth(employeeDocId: string): Promise<void> {
  const uid = await resolveAuthUidForEmployee(employeeDocId);
  if (!uid) return;

  await getAdminAuth().updateUser(uid, { disabled: false });
}

export async function deleteEmployeeAuth(employeeDocId: string): Promise<void> {
  const uid = await resolveAuthUidForEmployee(employeeDocId);
  if (!uid) return;

  await getAdminAuth().deleteUser(uid);
}
