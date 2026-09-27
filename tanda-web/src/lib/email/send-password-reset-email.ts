import { getAppLogoUrl } from '@/lib/app-url';
import {
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailText,
} from '@/lib/email/password-reset-email-html';

interface SendPasswordResetEmailInput {
  email: string;
  name: string;
  resetLink: string;
  appUrl: string;
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<'resend' | 'firebase'> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (apiKey && from) {
    const logoUrl = process.env.EMAIL_LOGO_URL?.trim() || getAppLogoUrl('horizontal');
    const content = {
      email: input.email,
      name: input.name,
      resetLink: input.resetLink,
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
        subject: 'Reset your Continental Cargo password',
        text: buildPasswordResetEmailText(content),
        html: buildPasswordResetEmailHtml(content),
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? 'Could not send the reset email.');
    }

    return 'resend';
  }

  const firebaseKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!firebaseKey) {
    throw new Error('Email delivery is not configured.');
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: input.email,
      }),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    throw new Error(body?.error?.message ?? 'Could not send the reset email.');
  }

  return 'firebase';
}
