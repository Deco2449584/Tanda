/** Helpers for camera / geolocation permission UX when the user previously tapped Block. */

export type BrowserPermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unsupported';

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

/** Ask for the camera again (shows the browser prompt when state is still "prompt"). */
export async function requestCameraAccess(): Promise<BrowserPermissionState> {
  if (!isSecureMediaContext()) return 'unsupported';
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false,
    });
    stream.getTracks().forEach((track) => track.stop());
    return 'granted';
  } catch (error) {
    const name =
      error && typeof error === 'object' && 'name' in error
        ? String((error as { name?: string }).name)
        : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'denied';
    }
    return 'denied';
  }
}

export function permissionHelpText(kind: MediaPermissionKind): string {
  if (kind === 'camera') {
    return 'Camera was blocked. Tap Try again — if nothing appears, open the lock/info icon in the address bar → Site settings → Camera → Allow, then reload.';
  }
  return 'Location was blocked. Tap Try again — if nothing appears, open the lock/info icon in the address bar → Site settings → Location → Allow, then reload.';
}
