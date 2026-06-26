import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseAuthError } from 'firebase-admin/auth';
import { COLLECTIONS } from '@/lib/constants';
import { getAppAuthActionUrl, getAppBaseUrl, getAppLoginUrl } from '@/lib/app-url';
import { rewriteFirebaseAuthLinkToApp } from '@/lib/auth/rewrite-firebase-auth-link';
import { sendEmployeeInviteEmail } from '@/lib/email/send-employee-invite-email';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export interface InviteEmployeeResult {
  uid: string;
  email: string;
  createdAuthUser: boolean;
  emailDelivery: 'resend' | 'firebase';
}

export async function inviteEmployeeAuth(input: {
  email: string;
  name: string;
  employeeDocId?: string;
}): Promise<InviteEmployeeResult> {
  const auth = getAdminAuth();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const appUrl = getAppBaseUrl();

  let uid: string;
  let createdAuthUser = false;

  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
  } catch (error) {
    if (error instanceof FirebaseAuthError && error.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email,
        displayName: name,
        emailVerified: false,
      });
      uid = created.uid;
      createdAuthUser = true;
    } else {
      throw error;
    }
  }

  const firebaseLink = await auth.generatePasswordResetLink(email, {
    url: getAppLoginUrl(),
    handleCodeInApp: false,
  });

  const setupLink = rewriteFirebaseAuthLinkToApp(firebaseLink, getAppAuthActionUrl());

  const emailDelivery = await sendEmployeeInviteEmail({
    email,
    name,
    setupLink,
    appUrl,
  });

  if (input.employeeDocId) {
    const employeeDoc = await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(input.employeeDocId)
      .get();

    const employeeActive = employeeDoc.exists
      ? employeeDoc.data()?.active !== false
      : true;

    if (employeeActive) {
      await auth.updateUser(uid, { disabled: false });
    }

    await getAdminFirestore()
      .collection(COLLECTIONS.EMPLOYEES)
      .doc(input.employeeDocId)
      .update({
        authUid: uid,
        inviteSentAt: FieldValue.serverTimestamp(),
      });
  }

  return { uid, email, createdAuthUser, emailDelivery };
}
