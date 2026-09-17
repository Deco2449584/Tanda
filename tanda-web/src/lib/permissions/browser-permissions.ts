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

/**
 * Browsers never re-show the system dialog after the user chose Block.
 * Only the user can flip it back in site / app settings.
 */
export function canBrowserReshowPermissionPrompt(
  state: BrowserPermissionState,
): boolean {
  return state === 'prompt' || state === 'granted';
}

function mediaErrorName(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    return String((error as { name?: string }).name ?? '');
  }
  return '';
}

/**
 * Ask for the camera. Prefer a user-gesture click handler.
 * If permission is already "denied", getUserMedia fails instantly with no dialog.
 */
export async function requestCameraAccess(): Promise<BrowserPermissionState> {
  if (!isSecureMediaContext()) return 'unsupported';
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';

  const prior = await queryBrowserPermission('camera');
  if (prior === 'denied') {
    return 'denied';
  }

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
    return 'Camera is blocked for this site.';
  }

  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    name === 'OverconstrainedError'
  ) {
    return 'No usable camera was found. Close other apps using the camera and try again.';
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is busy. Close other apps using the camera, then try again.';
  }

  return 'Could not open the camera.';
}

/** Step-by-step for Android Chrome / installed PWA when permission is permanently blocked. */
export function permissionUnblockSteps(kind: MediaPermissionKind): string[] {
  const label = kind === 'camera' ? 'Camera' : 'Location';
  return [
    `The browser will NOT ask again after you chose Block — that is normal.`,
    `Installed app: Android Settings → Apps → Continental Cargo (or Chrome) → Permissions → ${label} → Allow.`,
    `Or in Chrome: tap the lock icon on the site → Permissions → ${label} → Allow, then return here and tap “I’ve allowed it”.`,
  ];
}

export function permissionHelpText(kind: MediaPermissionKind): string {
  if (kind === 'camera') {
    return cameraErrorHelpText({ name: 'NotAllowedError' });
  }
  return 'Location is blocked for this site.';
}
