import { auth } from '@/lib/firebase';
import type { AttendanceJustification } from '@/lib/types/attendance-justification';

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

export async function fetchJustification(
  justificationId: string,
): Promise<AttendanceJustification | null> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/attendance/justifications?id=${encodeURIComponent(justificationId)}`,
    { headers },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error('Could not load justification.');
  }

  const data = (await response.json()) as { justification: AttendanceJustification };
  return data.justification;
}

export async function submitJustificationReason(input: {
  justificationId: string;
  reason: string;
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/attendance/justifications', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? 'Could not submit justification.');
  }
}

export async function fetchPendingJustifications(): Promise<AttendanceJustification[]> {
  return fetchJustificationsByQuery({ status: 'pending', type: 'no_show' });
}

export async function fetchPendingNoShowJustifications(): Promise<AttendanceJustification[]> {
  return fetchJustificationsByQuery({ status: 'pending', type: 'no_show' });
}

export async function fetchLateArrivalFeedback(): Promise<AttendanceJustification[]> {
  return fetchJustificationsByQuery({ status: 'submitted', type: 'late' });
}

async function fetchJustificationsByQuery(input: {
  status: string;
  type: string;
}): Promise<AttendanceJustification[]> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({
    status: input.status,
    type: input.type,
  });
  const response = await fetch(`/api/attendance/justifications?${params.toString()}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error('Could not load justifications.');
  }

  const data = (await response.json()) as { justifications: AttendanceJustification[] };
  return data.justifications.filter((item) => item.reason.trim().length > 0);
}

export async function reviewJustificationRequest(input: {
  justificationId: string;
  status: 'approved' | 'rejected';
  reviewerNote?: string;
}): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/attendance/justifications/${encodeURIComponent(input.justificationId)}`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: input.status,
        reviewerNote: input.reviewerNote,
      }),
    },
  );

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? 'Could not review justification.');
  }
}
