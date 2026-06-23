import { createHash } from 'crypto';

export const KIOSK_DEVICE_TOKEN_HEADER = 'x-kiosk-device-token';

export function hashKioskDeviceToken(token: string): string {
  return createHash('sha256').update(token.trim()).digest('hex');
}

export function getKioskDeviceTokenFromRequest(request: Request): string | null {
  const token = request.headers.get(KIOSK_DEVICE_TOKEN_HEADER)?.trim();
  return token || null;
}

export function getKioskDeviceShortCode(deviceId: string): string {
  return deviceId.slice(-6).toUpperCase();
}
