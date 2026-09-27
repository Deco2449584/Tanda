import type { CargoInspection } from '@/lib/types/cargo-inspection';
import { portalAuthHeaders } from '@/lib/portal/client-session';

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

  const data = (await response.json()) as {
    token?: string;
    awbNumber?: string;
    clientName?: string;
    error?: string;
  };

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

  const data = (await response.json()) as {
    token?: string;
    clientName?: string;
    error?: string;
  };

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

  const data = (await response.json()) as {
    kind?: 'awb' | 'account';
    awbNumber?: string;
    clientName?: string;
    inspections?: PortalInspectionSummary[];
    error?: string;
  };

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
  const response = await fetch(`/api/portal/inspections/${id}`, {
    headers: portalAuthHeaders(),
    cache: 'no-store',
  });

  const data = (await response.json()) as {
    inspection?: CargoInspection;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not load inspection.');
  }

  if (!data.inspection) {
    throw new Error('Inspection not found.');
  }

  return data.inspection;
}
