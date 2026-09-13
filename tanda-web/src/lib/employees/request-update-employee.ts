import { auth } from '@/lib/firebase';

export async function requestUpdateEmployee(
  employeeDocId: string,
  input: {
    fields: Record<string, unknown>;
    deleteFields?: string[];
  },
): Promise<void> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Your session expired. Sign in again and retry.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch(`/api/employees/${encodeURIComponent(employeeDocId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not save employee changes.');
  }
}
