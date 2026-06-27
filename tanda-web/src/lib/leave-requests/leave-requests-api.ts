import { auth } from '@/lib/firebase';
import type { LeaveRequestStatus } from '@/lib/types/leave-request';

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

export async function updateLeaveRequestStatusRequest(
  requestId: string,
  status: Exclude<LeaveRequestStatus, 'Pending'>,
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/leave-requests/${encodeURIComponent(requestId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not update leave request.');
  }
}
