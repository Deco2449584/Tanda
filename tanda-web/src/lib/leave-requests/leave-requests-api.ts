import { auth } from '@/lib/firebase';
import type {
  LeaveRequestStatus,
  UpdateLeaveRequestInput,
} from '@/lib/types/leave-request';

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

export async function updateLeaveRequestRequest(
  requestId: string,
  input: UpdateLeaveRequestInput,
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/leave-requests/${encodeURIComponent(requestId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not update leave request.');
  }
}

export async function deleteLeaveRequestRequest(requestId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/leave-requests/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not delete leave request.');
  }
}
