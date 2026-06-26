const FOUR_DIGIT_MIN = 1;
const FOUR_DIGIT_MAX = 9999;
const MAX_RANDOM_ATTEMPTS = 300;

function normalizeEmployeeId(value: string): string {
  return value.trim();
}

function toUsedIdSet(usedIds: Iterable<string>): Set<string> {
  const used = new Set<string>();
  for (const id of usedIds) {
    const normalized = normalizeEmployeeId(id);
    if (normalized) used.add(normalized);
  }
  return used;
}

export function isEmployeeIdTaken(usedIds: Iterable<string>, candidate: string): boolean {
  const normalized = normalizeEmployeeId(candidate);
  if (!normalized) return false;
  return toUsedIdSet(usedIds).has(normalized);
}

/** Picks a random unused 4-digit kiosk ID (e.g. "0042"). */
export function suggestEmployeeId(usedIds: Iterable<string>): string {
  const used = toUsedIdSet(usedIds);

  for (let attempt = 0; attempt < MAX_RANDOM_ATTEMPTS; attempt++) {
    const value =
      Math.floor(Math.random() * (FOUR_DIGIT_MAX - FOUR_DIGIT_MIN + 1)) + FOUR_DIGIT_MIN;
    const candidate = String(value).padStart(4, '0');
    if (!used.has(candidate)) return candidate;
  }

  for (let value = FOUR_DIGIT_MIN; value <= FOUR_DIGIT_MAX; value++) {
    const candidate = String(value).padStart(4, '0');
    if (!used.has(candidate)) return candidate;
  }

  throw new Error('No available 4-digit employee IDs.');
}
