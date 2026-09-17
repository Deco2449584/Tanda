export interface RegistrationGeoSnapshot {
  registeredLatitude: number;
  registeredLongitude: number;
  registeredAccuracyMeters?: number;
  registeredLocationAt: string;
  registeredMapsUrl: string;
}

export type RegistrationLocationErrorCode =
  | 'permission_denied'
  | 'unavailable'
  | 'unsupported'
  | 'timeout';

export class RegistrationLocationError extends Error {
  readonly code: RegistrationLocationErrorCode;

  constructor(code: RegistrationLocationErrorCode, message: string) {
    super(message);
    this.name = 'RegistrationLocationError';
    this.code = code;
  }
}

const GEOLOCATION_TIMEOUT_MS = 20_000;

/**
 * One-shot high-accuracy GPS capture at inspection save time, mirroring the
 * mobile app. Registration is blocked when the position cannot be read.
 */
export async function captureRegistrationLocation(): Promise<RegistrationGeoSnapshot> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new RegistrationLocationError(
      'unsupported',
      'This browser cannot read your GPS position. Use Chrome or Safari on a mobile device.',
    );
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(
            new RegistrationLocationError(
              'permission_denied',
              'Location permission is required to register cargo. Tap Save again to allow it. If no dialog appears: Chrome → Site settings → Location → Allow. Android App permissions only shows Location after that first allow prompt.',
            ),
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          reject(
            new RegistrationLocationError(
              'timeout',
              'Reading your GPS position took too long. Move to an open area and try again.',
            ),
          );
          return;
        }

        reject(
          new RegistrationLocationError(
            'unavailable',
            'Could not read your GPS position. Move to an open area and try again.',
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 0,
      },
    );
  });

  const { latitude, longitude, accuracy } = position.coords;

  return {
    registeredLatitude: latitude,
    registeredLongitude: longitude,
    registeredAccuracyMeters:
      typeof accuracy === 'number' && Number.isFinite(accuracy)
        ? Math.round(accuracy)
        : undefined,
    registeredLocationAt: new Date(position.timestamp).toISOString(),
    registeredMapsUrl: `https://maps.google.com/?q=${latitude},${longitude}`,
  };
}
