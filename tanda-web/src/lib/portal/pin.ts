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

export function generateUniquePortalPinFromList(
  takenPins: readonly string[],
  length = 6,
): string {
  const taken = new Set(takenPins.map((pin) => pin.trim()).filter(Boolean));

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = generatePortalPin(length);
    if (!taken.has(candidate)) return candidate;
  }

  throw new Error('Could not generate a unique PIN. Try entering one manually.');
}

export function isPortalPinTaken(
  pin: string,
  clients: readonly { id?: string; pin?: string }[],
  excludeClientId?: string,
): boolean {
  const trimmed = pin.trim();
  if (!trimmed) return false;

  return clients.some(
    (client) =>
      client.pin === trimmed &&
      (!excludeClientId || client.id !== excludeClientId),
  );
}

export function validatePortalPinFormat(pin: string): string | null {
  const trimmed = pin.trim();
  if (!/^\d{6,8}$/.test(trimmed)) {
    return 'PIN must be 6 to 8 digits.';
  }
  return null;
}
