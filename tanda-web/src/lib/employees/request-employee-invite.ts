import { auth } from '@/lib/firebase';

export interface RequestEmployeeInviteInput {
  email: string;
  name: string;
  employeeDocId: string;
}

export async function requestEmployeeInvite(
  input: RequestEmployeeInviteInput,
): Promise<void> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Your session expired. Sign in again and retry.');
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (!email || !name) {
    throw new Error('Email and name are required to send an invite.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/employees/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      email,
      name,
      employeeDocId: input.employeeDocId,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not send the invite email.');
  }
}
