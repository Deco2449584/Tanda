import { auth } from '@/lib/firebase';

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('You must be signed in.');
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function updateAttendanceRecordRequest(
  recordId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/attendance/records/${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not update attendance record.');
  }
}

export async function deleteAttendanceRecordRequest(recordId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/attendance/records/${encodeURIComponent(recordId)}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not delete attendance record.');
  }
}
