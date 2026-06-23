export interface CapturedGeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  geoCapturedAt: string;
}

const GEO_TIMEOUT_MS = 8000;

export function captureCurrentPosition(): Promise<CapturedGeoPosition | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }

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
        enableHighAccuracy: true,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 0,
      },
    );
  });
}
