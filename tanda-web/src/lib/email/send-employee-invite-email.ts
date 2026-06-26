interface SendEmployeeInviteEmailInput {
  email: string;
  name: string;
  setupLink: string;
  appUrl: string;
}

function buildInviteEmailHtml(input: SendEmployeeInviteEmailInput): string {
  const firstName = input.name.split(/\s+/)[0] || input.name;

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px">
      <h1 style="font-size:20px;margin:0 0 16px">Welcome to Continental Cargo</h1>
      <p>Hi ${firstName},</p>
      <p>
        An administrator created your employee account. Use the button below to set your
        password and sign in to <strong>${input.appUrl.replace(/^https?:\/\//, '')}</strong>.
      </p>
      <p style="margin:28px 0">
        <a href="${input.setupLink}"
           style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
          Set my password
        </a>
      </p>
      <p style="font-size:14px;color:#4b5563">
        After setting your password, go to
        <a href="${input.appUrl}/login">${input.appUrl}/login</a>
        and sign in with this email address.
      </p>
      <p style="font-size:13px;color:#6b7280;margin-top:24px">
        If you did not expect this email, contact your administrator.
      </p>
    </div>
  `.trim();
}

async function sendViaResend(input: SendEmployeeInviteEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not set.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.email],
      subject: 'Set up your Continental Cargo account',
      html: buildInviteEmailHtml(input),
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
