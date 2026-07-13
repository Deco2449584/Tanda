import { auth } from '@/lib/firebase';
import type { EmployeePersonalDetails } from '@/lib/types/employee';

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

export type SubmitEmployeeProfileInput = EmployeePersonalDetails & {
  passportUrl: string;
  visaUrl: string;
  passportFileName?: string;
  visaFileName?: string;
};

export async function submitEmployeeProfileRequest(
  input: SubmitEmployeeProfileInput,
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/employee-profile', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not submit personal profile.');
  }
}

export async function reviewEmployeeProfileRequest(
  employeeDocId: string,
  status: 'Approved' | 'Rejected',
  rejectionReason?: string,
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `/api/employee-profile/${encodeURIComponent(employeeDocId)}/review`,
    {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status, rejectionReason }),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? 'Could not review personal profile.');
  }
}
