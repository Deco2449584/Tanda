export const KIOSK_AUTH_STORAGE_KEY = 'kiosk_authorized';

export function isKioskAuthorizedInStorage(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KIOSK_AUTH_STORAGE_KEY) === 'true';
}

export function setKioskAuthorized(): void {
  localStorage.setItem(KIOSK_AUTH_STORAGE_KEY, 'true');
}

export function clearKioskAuthorization(): void {
  localStorage.removeItem(KIOSK_AUTH_STORAGE_KEY);
}

export function getKioskMasterPin(): string {
  return process.env.NEXT_PUBLIC_KIOSK_MASTER_PIN?.trim() ?? '';
}

export function verifyKioskMasterPin(input: string): boolean {
  const master = getKioskMasterPin();
  if (!master) return false;
  return input.trim() === master;
}

export function isKioskMasterPinConfigured(): boolean {
  return getKioskMasterPin().length > 0;
}
