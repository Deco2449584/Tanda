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

/** Internal staff code for non-workforce accounts (kiosk / admin / master). */
export function suggestAccountEmployeeId(
  prefix: string,
  usedIds: Iterable<string>,
): string {
  const normalizedPrefix = prefix.trim().toUpperCase().replace(/-+$/, '');
  const used = toUsedIdSet(usedIds);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const candidate = `${normalizedPrefix}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }

  throw new Error(`Could not generate a ${normalizedPrefix} account ID. Try again.`);
}
