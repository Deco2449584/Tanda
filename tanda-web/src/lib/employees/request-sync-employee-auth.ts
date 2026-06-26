import { auth } from '@/lib/firebase';

export type EmployeeAuthSyncAction = 'disable' | 'enable' | 'delete';

export async function requestSyncEmployeeAuth(
  employeeDocId: string,
  action: EmployeeAuthSyncAction,
): Promise<void> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Your session expired. Sign in again and retry.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/employees/sync-auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ employeeDocId, action }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not update sign-in access for this employee.');
  }
}
