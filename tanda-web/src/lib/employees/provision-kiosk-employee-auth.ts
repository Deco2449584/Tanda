import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseAuthError } from 'firebase-admin/auth';
import { COLLECTIONS } from '@/lib/constants';
import { normalizeKioskLoginEmail } from '@/lib/employees/normalize-kiosk-login-email';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

const MIN_PASSWORD_LENGTH = 6;

export async function provisionKioskEmployeeAuth(input: {
  email: string;
  password: string;
  name: string;
  employeeDocId: string;
}): Promise<{ uid: string; email: string }> {
  const auth = getAdminAuth();
  const email = normalizeKioskLoginEmail(input.email);
  const name = input.name.trim();
  const password = input.password;
  const employeeRef = getAdminFirestore()
    .collection(COLLECTIONS.EMPLOYEES)
    .doc(input.employeeDocId);

  if (!email || !name) {
    throw new Error('Email and name are required.');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const employeeDoc = await employeeRef.get();
  if (!employeeDoc.exists) {
    throw new Error('Employee not found.');
  }

  const existingAuthUid =
    typeof employeeDoc.data()?.authUid === 'string'
      ? employeeDoc.data()!.authUid.trim()
      : '';

  let uid: string;

  if (existingAuthUid) {
    await auth.updateUser(existingAuthUid, {
      email,
      password,
      displayName: name,
      disabled: false,
      emailVerified: true,
    });
    uid = existingAuthUid;
  } else {
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
      await auth.updateUser(uid, {
        password,
        displayName: name,
        disabled: false,
        emailVerified: true,
      });
    } catch (error) {
      if (error instanceof FirebaseAuthError && error.code === 'auth/user-not-found') {
        const created = await auth.createUser({
          email,
          password,
          displayName: name,
          emailVerified: true,
        });
        uid = created.uid;
      } else {
        throw error;
      }
    }
  }

  await employeeRef.update({
    email,
    authUid: uid,
    inviteSentAt: FieldValue.delete(),
  });

  return { uid, email };
}
