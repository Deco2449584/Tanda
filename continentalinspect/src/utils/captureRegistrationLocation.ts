import * as Location from 'expo-location';

export type RegistrationGeoSnapshot = {
  registeredLatitude: number;
  registeredLongitude: number;
  registeredAccuracyMeters?: number;
  registeredLocationAt: string;
  registeredMapsUrl: string;
};

export class RegistrationLocationError extends Error {
  readonly code: 'permission_denied' | 'unavailable' | 'mocked';

  constructor(code: RegistrationLocationError['code'], message: string) {
    super(message);
    this.name = 'RegistrationLocationError';
    this.code = code;
  }
}

/**
 * One-shot GPS capture at inspection save time (fraud / traceability).
 */
export async function captureRegistrationLocation(): Promise<RegistrationGeoSnapshot> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new RegistrationLocationError(
      'permission_denied',
      'Location permission is required to register cargo. Enable location access and try again.',
    );
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    if (position.mocked === true && !__DEV__) {
      throw new RegistrationLocationError(
        'mocked',
        'Mocked GPS locations are not allowed. Disable mock location and try again.',
      );
    }

    const { latitude, longitude, accuracy } = position.coords;
    const registeredLocationAt = new Date(position.timestamp).toISOString();
    const registeredMapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

    return {
      registeredLatitude: latitude,
      registeredLongitude: longitude,
      registeredAccuracyMeters:
        typeof accuracy === 'number' && Number.isFinite(accuracy)
          ? Math.round(accuracy)
          : undefined,
      registeredLocationAt,
      registeredMapsUrl,
    };
  } catch (error) {
    if (error instanceof RegistrationLocationError) {
      throw error;
    }
    throw new RegistrationLocationError(
      'unavailable',
      'Could not read your GPS position. Move to an open area and try again.',
    );
  }
}
