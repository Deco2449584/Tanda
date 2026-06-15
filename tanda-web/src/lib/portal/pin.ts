import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export function hashPortalPin(pin: string): string {
  return bcrypt.hashSync(pin.trim(), SALT_ROUNDS);
}

export function verifyPortalPin(pin: string, pinHash: string): boolean {
  if (!pinHash) return false;
  return bcrypt.compareSync(pin.trim(), pinHash);
}

export function generatePortalPin(length = 6): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

export function validatePortalPinFormat(pin: string): string | null {
  const trimmed = pin.trim();
  if (!/^\d{6,8}$/.test(trimmed)) {
    return 'PIN must be 6 to 8 digits.';
  }
  return null;
}
