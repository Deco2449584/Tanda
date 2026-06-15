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
  weightKg: number;
  boxCount: number;
  registeredAt: string;
  updatedAt?: string;
}

export async function verifyPortalAccess(
  awbNumber: string,
  pin: string,
): Promise<{ token: string; awbNumber: string }> {
  const response = await fetch('/api/portal/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awbNumber, pin }),
  });

  const data = (await response.json()) as {
    token?: string;
    awbNumber?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not verify access.');
  }

  if (!data.token || !data.awbNumber) {
    throw new Error('Invalid server response.');
  }

  return { token: data.token, awbNumber: data.awbNumber };
}

export async function fetchPortalInspectionsList(): Promise<{
  awbNumber: string;
  inspections: PortalInspectionSummary[];
}> {
  const response = await fetch('/api/portal/inspections', {
    headers: portalAuthHeaders(),
    cache: 'no-store',
  });

  const data = (await response.json()) as {
    awbNumber?: string;
    inspections?: PortalInspectionSummary[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not load inspections.');
  }

  return {
    awbNumber: data.awbNumber ?? '',
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
