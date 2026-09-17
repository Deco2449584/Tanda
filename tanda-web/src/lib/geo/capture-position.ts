export interface CapturedGeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  geoCapturedAt: string;
}

export type CapturePositionFailure =
  | 'permission_denied'
  | 'unavailable'
  | 'unsupported'
  | 'timeout';

export type CapturePositionResult =
  | { ok: true; position: CapturedGeoPosition }
  | { ok: false; reason: CapturePositionFailure };

export interface CapturePositionOptions {
  /** Max wait for a fix. Default 8000. */
  timeoutMs?: number;
  /** Prefer GPS. Default true. Use false for faster network location. */
  enableHighAccuracy?: boolean;
  /** Accept a cached fix up to this age (ms). Default 0. */
  maximumAgeMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

export const LOCATION_PERMISSION_DENIED_MESSAGE =
  'Location is blocked for this site. Browsers will not ask again after Block. Enable it in Android Settings → Apps → Permissions → Location (or Chrome site settings), then tap Try again.';

export function captureCurrentPositionResult(
  options: CapturePositionOptions = {},
): Promise<CapturePositionResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported' });
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const enableHighAccuracy = options.enableHighAccuracy ?? true;
  const maximumAge = options.maximumAgeMs ?? 0;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            geoCapturedAt: new Date().toISOString(),
          },
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ ok: false, reason: 'permission_denied' });
          return;
        }
        if (error.code === error.TIMEOUT) {
          resolve({ ok: false, reason: 'timeout' });
          return;
        }
        resolve({ ok: false, reason: 'unavailable' });
      },
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge,
      },
    );
  });
}

export async function captureCurrentPosition(
  options: CapturePositionOptions = {},
): Promise<CapturedGeoPosition | null> {
  const result = await captureCurrentPositionResult(options);
  return result.ok ? result.position : null;
}

/**
 * Slower, high-accuracy fix used when the site requires proof of presence.
 * Worth the wait because the punch is rejected without it.
 */
export function captureGeofencePositionResult(): Promise<CapturePositionResult> {
  return captureCurrentPositionResult({
    timeoutMs: 15_000,
    enableHighAccuracy: true,
    maximumAgeMs: 0,
  });
}

export async function captureGeofencePosition(): Promise<CapturedGeoPosition | null> {
  const result = await captureGeofencePositionResult();
  return result.ok ? result.position : null;
}

/** Fast geo for scan punches — never block longer than ~1.5s. */
export function captureScanPunchPositionResult(): Promise<CapturePositionResult> {
  return captureCurrentPositionResult({
    timeoutMs: 1500,
    enableHighAccuracy: false,
    maximumAgeMs: 60_000,
  });
}

export async function captureScanPunchPosition(): Promise<CapturedGeoPosition | null> {
  const result = await captureScanPunchPositionResult();
  return result.ok ? result.position : null;
}
