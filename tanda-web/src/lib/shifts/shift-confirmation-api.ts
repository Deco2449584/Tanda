import { auth } from '@/lib/firebase';
import type { Shift, ShiftConfirmationStatus } from '@/lib/types/shift';

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

export async function respondToShiftConfirmationRequest(input: {
  shiftId: string;
  response: Exclude<ShiftConfirmationStatus, 'pending'>;
  note?: string;
}): Promise<Shift> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/shifts/${encodeURIComponent(input.shiftId)}/confirm`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        response: input.response,
        note: input.note,
      }),
    },
  );

  const data = (await response.json().catch(() => null)) as {
    shift?: Shift;
    error?: string;
  } | null;

  if (!response.ok || !data?.shift) {
    throw new Error(data?.error ?? 'Could not update shift confirmation.');
  }

  return data.shift;
}
