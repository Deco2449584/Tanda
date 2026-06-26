import { getAppLogoUrl } from '@/lib/app-url';
import {
  buildEmployeeInviteEmailHtml,
  buildEmployeeInviteEmailText,
} from '@/lib/email/employee-invite-email-html';

interface SendEmployeeInviteEmailInput {
  email: string;
  name: string;
  setupLink: string;
  appUrl: string;
}

async function sendViaResend(input: SendEmployeeInviteEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not set.');
  }

  const logoUrl = process.env.EMAIL_LOGO_URL?.trim() || getAppLogoUrl('light');
  const emailContent = {
    email: input.email,
    name: input.name,
    setupLink: input.setupLink,
    appUrl: input.appUrl,
    logoUrl,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: 'Welcome to Continental Cargo — set your password',
      text: buildEmployeeInviteEmailText(emailContent),
      html: buildEmployeeInviteEmailHtml(emailContent),
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Resend could not send the invite email.');
  }

  return true;
}

async function sendViaFirebasePasswordReset(email: string): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Firebase API key is not configured for invite emails.');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email,
      }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(body?.error?.message ?? 'Firebase could not send the invite email.');
  }
}

/** Sends a branded invite when Resend is configured; otherwise uses Firebase's reset email. */
export async function sendEmployeeInviteEmail(
  input: SendEmployeeInviteEmailInput,
): Promise<'resend' | 'firebase'> {
  const sentWithResend = await sendViaResend(input);
  if (sentWithResend) return 'resend';

  await sendViaFirebasePasswordReset(input.email);
  return 'firebase';
}
