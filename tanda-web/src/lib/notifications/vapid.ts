export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? '';
}

export function getVapidConfig(): VapidConfig {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? '';
  const subject =
    process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@continentalcargo.com';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys are not configured.');
  }

  return { publicKey, privateKey, subject };
}

export function isPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && process.env.VAPID_PRIVATE_KEY?.trim());
}
