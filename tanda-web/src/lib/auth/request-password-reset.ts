import { FirebaseAuthError } from 'firebase-admin/auth';
import { COLLECTIONS } from '@/lib/constants';
import { getAppAuthActionUrl, getAppBaseUrl, getAppLoginUrl } from '@/lib/app-url';
import { rewriteFirebaseAuthLinkToApp } from '@/lib/auth/rewrite-firebase-auth-link';
import { sendPasswordResetEmail } from '@/lib/email/send-password-reset-email';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export class PasswordResetRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PasswordResetRequestError';
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();

  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new PasswordResetRequestError('Enter a valid email address.', 400);
  }

  const employees = getAdminFirestore().collection(COLLECTIONS.EMPLOYEES);
  let snapshot = await employees.where('email', '==', email).limit(1).get();

  if (snapshot.empty && rawEmail.trim() !== email) {
    snapshot = await employees.where('email', '==', rawEmail.trim()).limit(1).get();
  }

  if (snapshot.empty) {
    throw new PasswordResetRequestError(
      'This email is not an active account. Check the address or contact your administrator.',
      404,
    );
  }

  const employee = snapshot.docs[0].data() as {
    name?: string;
    active?: boolean;
  };

  if (employee.active === false) {
    throw new PasswordResetRequestError(
      'This account has been deactivated. Contact your administrator.',
      403,
    );
  }

  const auth = getAdminAuth();
  let authUser;

  try {
    authUser = await auth.getUserByEmail(email);
  } catch (error) {
    if (error instanceof FirebaseAuthError && error.code === 'auth/user-not-found') {
      throw new PasswordResetRequestError(
        'This email is not set up for sign-in yet. Contact your administrator.',
        404,
      );
    }
    throw error;
  }

  if (authUser.disabled) {
    throw new PasswordResetRequestError(
      'This account has been deactivated. Contact your administrator.',
      403,
    );
  }

  const firebaseLink = await auth.generatePasswordResetLink(email, {
    url: getAppLoginUrl(),
    handleCodeInApp: false,
  });
  const resetLink = rewriteFirebaseAuthLinkToApp(firebaseLink, getAppAuthActionUrl());
  const name =
    typeof employee.name === 'string' && employee.name.trim()
      ? employee.name.trim()
      : email;

  await sendPasswordResetEmail({
    email,
    name,
    resetLink,
    appUrl: getAppBaseUrl(),
  });
}
