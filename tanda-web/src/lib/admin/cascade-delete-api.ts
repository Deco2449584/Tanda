import { auth } from '@/lib/firebase';
import type {
  EmployeeCascadePreview,
  LocationCascadePreview,
} from '@/lib/types/cascade-delete';

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

export async function fetchEmployeeCascadePreview(
  employeeDocId: string,
): Promise<EmployeeCascadePreview> {
  const response = await fetch(`/api/employees/${encodeURIComponent(employeeDocId)}/cascade`, {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as
    | { preview?: EmployeeCascadePreview; error?: string }
    | null;
  if (!response.ok || !data?.preview) {
    throw new Error(data?.error ?? 'Could not load delete preview.');
  }
  return data.preview;
}

export async function requestEmployeeCascadeDelete(
  employeeDocId: string,
): Promise<EmployeeCascadePreview> {
  const response = await fetch(`/api/employees/${encodeURIComponent(employeeDocId)}/cascade`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as
    | { preview?: EmployeeCascadePreview; error?: string }
    | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not delete employee.');
  }
  return data?.preview as EmployeeCascadePreview;
}

export async function fetchLocationCascadePreview(
  locationId: string,
): Promise<LocationCascadePreview> {
  const response = await fetch(`/api/locations/${encodeURIComponent(locationId)}/cascade`, {
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as
    | { preview?: LocationCascadePreview; error?: string }
    | null;
  if (!response.ok || !data?.preview) {
    throw new Error(data?.error ?? 'Could not load delete preview.');
  }
  return data.preview;
}

export async function requestLocationCascadeDelete(
  locationId: string,
): Promise<LocationCascadePreview> {
  const response = await fetch(`/api/locations/${encodeURIComponent(locationId)}/cascade`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  const data = (await response.json().catch(() => null)) as
    | { preview?: LocationCascadePreview; error?: string }
    | null;
  if (!response.ok) {
    throw new Error(data?.error ?? 'Could not delete client.');
  }
  return data?.preview as LocationCascadePreview;
}
