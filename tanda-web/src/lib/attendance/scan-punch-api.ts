import { auth } from '@/lib/firebase';
import type { AttendanceType } from '@/lib/types/attendance';
import type { AttendanceWorkState } from '@/lib/attendance/resolve-attendance-action';

export interface ScanPunchResponse {
  ok: true;
  actionType: AttendanceType;
  recordedAt: string;
  employeeName: string;
  locationName: string;
  locationCity: string;
  state: AttendanceWorkState;
}

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

export async function submitScanPunchRequest(input: {
  token: string;
  via?: 'qr' | 'nfc';
  latitude?: number;
  longitude?: number;
  geoAccuracy?: number;
  geoCapturedAt?: string;
}): Promise<ScanPunchResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch('/api/attendance/scan-punch', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      token: input.token,
      via: input.via ?? 'qr',
      latitude: input.latitude,
      longitude: input.longitude,
      geoAccuracy: input.geoAccuracy,
      geoCapturedAt: input.geoCapturedAt,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & Partial<ScanPunchResponse>;

  if (!response.ok) {
    throw new Error(payload.error ?? 'Could not record scan punch.');
  }

  return payload as ScanPunchResponse;
}
