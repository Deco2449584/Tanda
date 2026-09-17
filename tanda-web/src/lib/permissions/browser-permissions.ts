/** Helpers for camera / geolocation permission UX. */

export type BrowserPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported'
  | 'unavailable';

export type MediaPermissionKind = 'camera' | 'geolocation';

export function isSecureMediaContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext;
}

export async function queryBrowserPermission(
  kind: MediaPermissionKind,
): Promise<BrowserPermissionState> {
  if (typeof navigator === 'undefined') return 'unsupported';

  if (kind === 'camera' && !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }
  if (kind === 'geolocation' && !navigator.geolocation) {
    return 'unsupported';
  }

  if (!navigator.permissions?.query) {
    return 'prompt';
  }

  try {
    const status = await navigator.permissions.query({
      name: kind as PermissionName,
    });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'prompt';
  } catch {
    // Safari / some WebViews reject camera permission queries.
    return 'prompt';
  }
}

function mediaErrorName(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name?: string }).name ?? '');
  }
  return '';
}

/**
 * Ask for the camera. Prefer a user-gesture click handler.
 * Tries a soft front-camera constraint, then a bare video track (Android-friendly).
 */
export async function requestCameraAccess(): Promise<BrowserPermissionState> {
  if (!isSecureMediaContext()) return 'unsupported';
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';

  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: 'user' } } },
    { audio: false, video: true },
  ];

  let lastName = '';

  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) => track.stop());
      return 'granted';
    } catch (error) {
      lastName = mediaErrorName(error);
      if (lastName === 'NotAllowedError' || lastName === 'PermissionDeniedError') {
        return 'denied';
      }
      // Overconstrained / NotFound → try next constraint set.
    }
  }

  if (
    lastName === 'NotFoundError' ||
    lastName === 'DevicesNotFoundError' ||
    lastName === 'OverconstrainedError'
  ) {
    return 'unavailable';
  }

  return 'denied';
}

export function cameraErrorHelpText(error?: unknown): string {
  const name = mediaErrorName(error);

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission is blocked. Tap Try again to allow it. If no dialog appears: Chrome → Site settings → Camera → Allow (or Android Settings → Apps → Continental Cargo → Permissions, after the first allow prompt).';
  }

  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError'
  ) {
    return 'No usable camera was found on this device. Close other apps using the camera and try again.';
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is busy or could not start. Close other apps using the camera, then tap Try again.';
  }

  return 'Could not open the camera. Tap Try again to allow access.';
}

export function permissionHelpText(kind: MediaPermissionKind): string {
  if (kind === 'camera') {
    return cameraErrorHelpText({ name: 'NotAllowedError' });
  }
  return 'Location permission is blocked. Tap Try again to allow it. If no dialog appears: Chrome → Site settings → Location → Allow (or Android App permissions after the first allow prompt).';
}
