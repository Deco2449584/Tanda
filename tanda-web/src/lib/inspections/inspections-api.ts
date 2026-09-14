import { auth } from '@/lib/firebase';
import type { DeleteCargoInspectionResult } from '@/lib/types/cargo-inspection';

async function authHeaders(): Promise<HeadersInit> {
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Your session expired. Sign in again and retry.');
  }
  const idToken = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
  };
}

export async function requestDeleteInspection(
  inspectionId: string,
): Promise<DeleteCargoInspectionResult> {
  const response = await fetch(
    `/api/inspections/${encodeURIComponent(inspectionId)}`,
    {
      method: 'DELETE',
      headers: await authHeaders(),
    },
  );

  const data = (await response.json().catch(() => null)) as
    | { ok?: boolean; result?: DeleteCargoInspectionResult; error?: string }
    | null;

  if (!response.ok || !data?.result) {
    throw new Error(data?.error ?? 'Could not delete inspection.');
  }

  return data.result;
}
