import type { CargoInspection } from '@/lib/types/cargo-inspection';
import { portalAuthHeaders } from '@/lib/portal/client-session';

async function readPortalJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      response.status === 404
        ? 'Inspection not found.'
        : 'Could not reach the portal service. Please try again.',
    );
  }

  return (await response.json()) as T;
}

export interface PortalInspectionSummary {
  id: string;
  uldId: string;
  awbNumber: string;
  status: CargoInspection['status'];
  hasIssues: boolean;
  conservationType: CargoInspection['conservationType'];
  foodType: string;
  unitType?: CargoInspection['unitType'];
  weightKg: number;
  boxCount: number;
  countUnit?: CargoInspection['countUnit'];
  registeredAt: string;
  updatedAt?: string;
  clientLocationName?: string;
  photoUrl?: string;
}

export async function verifyPortalAccess(
  awbNumber: string,
  pin: string,
): Promise<{
  token: string;
  kind: 'awb';
  awbNumber: string;
  clientName: string;
}> {
  const response = await fetch('/api/portal/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awbNumber, pin }),
  });

  const data = await readPortalJson<{
    token?: string;
    awbNumber?: string;
    clientName?: string;
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not verify access.');
  }

  if (!data.token || !data.awbNumber) {
    throw new Error('Invalid server response.');
  }

  return {
    token: data.token,
    kind: 'awb',
    awbNumber: data.awbNumber,
    clientName: data.clientName ?? '',
  };
}

export async function loginPortalAccount(
  username: string,
  password: string,
): Promise<{ token: string; kind: 'account'; clientName: string }> {
  const response = await fetch('/api/portal/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await readPortalJson<{
    token?: string;
    clientName?: string;
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not sign in.');
  }

  if (!data.token) {
    throw new Error('Invalid server response.');
  }

  return {
    token: data.token,
    kind: 'account',
    clientName: data.clientName ?? '',
  };
}

export async function fetchPortalInspectionsList(): Promise<{
  kind: 'awb' | 'account';
  awbNumber: string;
  clientName: string;
  inspections: PortalInspectionSummary[];
}> {
  const response = await fetch('/api/portal/inspections', {
    headers: portalAuthHeaders(),
    cache: 'no-store',
  });

  const data = await readPortalJson<{
    kind?: 'awb' | 'account';
    awbNumber?: string;
    clientName?: string;
    inspections?: PortalInspectionSummary[];
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not load inspections.');
  }

  return {
    kind: data.kind === 'account' ? 'account' : 'awb',
    awbNumber: data.awbNumber ?? '',
    clientName: data.clientName ?? '',
    inspections: data.inspections ?? [],
  };
}

export async function fetchPortalInspectionDetail(
  id: string,
): Promise<CargoInspection> {
  const response = await fetch(
    `/api/portal/inspections?id=${encodeURIComponent(id)}`,
    {
      headers: portalAuthHeaders(),
      cache: 'no-store',
    },
  );

  const data = await readPortalJson<{
    inspection?: CargoInspection;
    error?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not load inspection.');
  }

  if (!data.inspection) {
    throw new Error('Inspection not found.');
  }

  return data.inspection;
}
