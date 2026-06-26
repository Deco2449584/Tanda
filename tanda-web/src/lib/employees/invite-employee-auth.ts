import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseAuthError } from 'firebase-admin/auth';
import { COLLECTIONS } from '@/lib/constants';
import { getAppAuthActionUrl, getAppBaseUrl } from '@/lib/app-url';
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

  const setupLink = await auth.generatePasswordResetLink(email, {
    url: getAppAuthActionUrl(),
    handleCodeInApp: true,
  });

  const emailDelivery = await sendEmployeeInviteEmail({
    email,
    name,
    setupLink,
    appUrl,
  });

  if (input.employeeDocId) {
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
