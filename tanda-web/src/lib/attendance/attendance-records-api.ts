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

export class AttendanceRestrictionError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AttendanceRestrictionError';
    this.code = code;
  }
}

export async function createAttendanceRecordRequest(
  payload: Record<string, unknown>,
): Promise<{ id: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/attendance/records', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    restrictionViolation?: boolean;
    code?: string;
    id?: string;
  } | null;

  if (!response.ok) {
    if (response.status === 409 && data?.restrictionViolation) {
      throw new AttendanceRestrictionError(
        data.error ?? 'This check-in violates attendance restrictions.',
        data.code ?? 'restriction',
      );
    }

    throw new Error(data?.error ?? 'Could not create attendance record.');
  }

  return { id: data?.id ?? '' };
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
