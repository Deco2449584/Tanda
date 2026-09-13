export interface CapturedGeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  geoCapturedAt: string;
}

export interface CapturePositionOptions {
  /** Max wait for a fix. Default 8000. */
  timeoutMs?: number;
  /** Prefer GPS. Default true. Use false for faster network location. */
  enableHighAccuracy?: boolean;
  /** Accept a cached fix up to this age (ms). Default 0. */
  maximumAgeMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

export function captureCurrentPosition(
  options: CapturePositionOptions = {},
): Promise<CapturedGeoPosition | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const enableHighAccuracy = options.enableHighAccuracy ?? true;
  const maximumAge = options.maximumAgeMs ?? 0;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          geoCapturedAt: new Date().toISOString(),
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge,
      },
    );
  });
}

/** Fast geo for scan punches — never block longer than ~1.5s. */
export function captureScanPunchPosition(): Promise<CapturedGeoPosition | null> {
  return captureCurrentPosition({
    timeoutMs: 1500,
    enableHighAccuracy: false,
    maximumAgeMs: 60_000,
  });
}
