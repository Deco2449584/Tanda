import type { Location } from '@/lib/types/location';

export function getLocationLabel(
  locationId: string | undefined,
  locations: readonly Location[],
): string {
  if (!locationId?.trim()) return '—';

  const location = locations.find((item) => item.id === locationId);
  if (!location) return '—';

  if (location.city) {
    return `${location.name} (${location.city})`;
  }

  return location.name;
}

export function getLocationById(
  locationId: string | undefined,
  locations: readonly Location[],
): Location | undefined {
  if (!locationId?.trim()) return undefined;
  return locations.find((item) => item.id === locationId);
}
