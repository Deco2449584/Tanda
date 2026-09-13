/** Australian states / territories used for Xero Location tracking. */
export const AU_LOCATION_STATES = [
  'NSW',
  'QLD',
  'VIC',
  'SA',
  'WA',
  'TAS',
  'ACT',
  'NT',
] as const;

export type AuLocationState = (typeof AU_LOCATION_STATES)[number];

export function isAuLocationState(value: string | null | undefined): value is AuLocationState {
  if (!value) return false;
  return (AU_LOCATION_STATES as readonly string[]).includes(value.trim().toUpperCase());
}

export function normalizeAuLocationState(
  value: string | null | undefined,
): AuLocationState | undefined {
  if (!value?.trim()) return undefined;
  const upper = value.trim().toUpperCase();
  return isAuLocationState(upper) ? upper : undefined;
}
