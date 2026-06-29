import { auth } from '@/lib/firebase';
import { normalizeKioskLoginEmail } from '@/lib/employees/normalize-kiosk-login-email';

export async function requestKioskEmployeeAuth(input: {
  email: string;
  password: string;
  name: string;
  employeeDocId: string;
}): Promise<void> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Your session expired. Sign in again and retry.');
  }

  const email = normalizeKioskLoginEmail(input.email);
  const name = input.name.trim();
  const password = input.password;

  if (!email || !name || !password) {
    throw new Error('Email, name, and password are required.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/employees/kiosk-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      email,
      name,
      password,
      employeeDocId: input.employeeDocId,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not set the kiosk sign-in password.');
  }
}
