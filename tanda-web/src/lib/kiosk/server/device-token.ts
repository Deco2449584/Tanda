import { createHash } from 'crypto';

export const KIOSK_DEVICE_TOKEN_HEADER = 'x-kiosk-device-token';
export const KIOSK_CLIENT_SESSION_HEADER = 'x-kiosk-client-session';

export function hashKioskDeviceToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

export function getKioskDeviceTokenFromRequest(request: Request): string | null {
  const token = request.headers.get(KIOSK_DEVICE_TOKEN_HEADER)?.trim();
  return token || null;
}

export function getKioskClientSessionIdFromRequest(request: Request): string | null {
  const id = request.headers.get(KIOSK_CLIENT_SESSION_HEADER)?.trim();
  return id || null;
}

/** Lock PINs are short, so hashing is just to avoid storing them in plaintext. */
export function hashKioskLockPin(pin: string): string {
  return createHash('sha256').update(`kiosk-lock:${pin.trim()}`).digest('hex');
}
