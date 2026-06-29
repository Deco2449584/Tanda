const KIOSK_ID_PREFIX = 'KIOSK-';
const MAX_ATTEMPTS = 200;

function normalizeEmployeeId(value: string): string {
  return value.trim().toUpperCase();
}

function toUsedIdSet(usedIds: Iterable<string>): Set<string> {
  const used = new Set<string>();
  for (const id of usedIds) {
    const normalized = normalizeEmployeeId(id);
    if (normalized) used.add(normalized);
  }
  return used;
}

/** Internal staff code for kiosk login accounts — not used as an employee PIN at the terminal. */
export function suggestKioskAccountEmployeeId(usedIds: Iterable<string>): string {
  const used = toUsedIdSet(usedIds);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const candidate = `${KIOSK_ID_PREFIX}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }

  throw new Error('Could not generate a kiosk account ID. Try again.');
}
