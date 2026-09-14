import { parseScanPunchVia, type ScanPunchVia } from '@/lib/attendance/scan-punch-token';

/**
 * Short-lived, tab-scoped handoff so the long scan token does not linger in the
 * address bar after a QR scan or NFC tap. The geofence is the real control
 * against remote punches — this only reduces casual token copying.
 */
const CLAIM_KEY = 'tanda.scan-punch-claim';
const CLAIM_TTL_MS = 5 * 60_000;

export interface ScanPunchClaim {
  token: string;
  via: ScanPunchVia;
  createdAt: number;
}

function getStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Returns false when the browser blocks sessionStorage (caller keeps the URL flow). */
export function storeScanPunchClaim(token: string, via: ScanPunchVia): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const claim: ScanPunchClaim = { token, via, createdAt: Date.now() };

  try {
    storage.setItem(CLAIM_KEY, JSON.stringify(claim));
    return true;
  } catch {
    return false;
  }
}

export function readScanPunchClaim(): ScanPunchClaim | null {
  const storage = getStorage();
  if (!storage) return null;

  const raw = storage.getItem(CLAIM_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ScanPunchClaim>;
    const token = typeof parsed.token === 'string' ? parsed.token.trim() : '';
    const createdAt =
      typeof parsed.createdAt === 'number' ? parsed.createdAt : 0;

    if (!token || Date.now() - createdAt > CLAIM_TTL_MS) {
      clearScanPunchClaim();
      return null;
    }

    return {
      token,
      via: parseScanPunchVia(
        typeof parsed.via === 'string' ? parsed.via : undefined,
      ),
      createdAt,
    };
  } catch {
    clearScanPunchClaim();
    return null;
  }
}

export function clearScanPunchClaim(): void {
  try {
    getStorage()?.removeItem(CLAIM_KEY);
  } catch {
    // Nothing to clean up.
  }
}
